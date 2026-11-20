import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  BlendMode,
  degrees,
  EncryptedPDFError,
  LineCapStyle,
  PDFBool,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import type { FieldValue, FieldWidget, FontFamily, Item, PageInfo } from "./types";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy, PDFPageProxy };
export const { AnnotationMode, RenderingCancelledException } = pdfjs;

const assets = `${import.meta.env.BASE_URL}pdfjs/`;

/** Padding inside a text item, in view units. Shared by the editor UI and the exporter. */
export const TEXT_PAD = 2;
export const LINE_HEIGHT = 1.2;

/**
 * Distance from the top of a line box (line-height 1.2) to the baseline, as a fraction of the
 * font size. The UI uses Arimo / Tinos / Cousine, which are metric-compatible with the PDF
 * standard fonts, so what you see on screen lands at the same place in the saved file.
 */
const BASELINE: Record<FontFamily, number> = {
  helvetica: (LINE_HEIGHT - 1.117) / 2 + 0.905,
  times: (LINE_HEIGHT - 1.107) / 2 + 0.891,
  courier: (LINE_HEIGHT - 1.133) / 2 + 0.833,
};

export const SYMBOL_PATHS = {
  check: "M4.5 12.75l5 5 10-11",
  cross: "M6 6l12 12M18 6L6 18",
} as const;
export const SYMBOL_STROKE = 2.75;

export async function loadPdf(
  bytes: Uint8Array,
  onPassword: (retry: boolean) => Promise<string | null>,
): Promise<PDFDocumentProxy> {
  const task = pdfjs.getDocument({
    data: bytes.slice(), // pdf.js transfers the buffer to its worker; keep our copy intact
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    iccUrl: `${assets}iccs/`,
    enableXfa: false,
  });
  task.onPassword = async (update: (pw: string) => void, reason: number) => {
    const pw = await onPassword(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    if (pw === null) task.destroy();
    else update(pw);
  };
  return task.promise;
}

export function pageInfo(page: PDFPageProxy): PageInfo {
  const vp = page.getViewport({ scale: 1 });
  return { index: page.pageNumber - 1, width: vp.width, height: vp.height, rotation: vp.rotation };
}

// pdf.js does not export a type for annotation data, so describe the bits we use.
interface WidgetData {
  id: string;
  subtype: string;
  fieldType?: string;
  fieldName?: string;
  alternativeText?: string;
  fieldValue?: string | string[] | null;
  fieldFlags?: number;
  rect: number[];
  hidden?: boolean;
  readOnly?: boolean;
  required?: boolean;
  multiLine?: boolean;
  password?: boolean;
  maxLen?: number;
  comb?: boolean;
  textAlignment?: number;
  defaultAppearanceData?: { fontSize?: number };
  checkBox?: boolean;
  radioButton?: boolean;
  pushButton?: boolean;
  exportValue?: string;
  buttonValue?: string;
  combo?: boolean;
  multiSelect?: boolean;
  options?: { exportValue: string; displayValue: string }[];
}

export async function extractFields(doc: PDFDocumentProxy) {
  const widgets: FieldWidget[] = [];
  const values: Record<string, FieldValue> = {};

  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const vp = page.getViewport({ scale: 1 });
    const annots = (await page.getAnnotations({ intent: "display" })) as WidgetData[];

    for (const a of annots) {
      if (a.subtype !== "Widget" || a.hidden || a.pushButton || !a.fieldName) continue;

      let kind: FieldWidget["kind"];
      if (a.fieldType === "Tx") kind = "text";
      else if (a.fieldType === "Btn" && a.checkBox) kind = "checkbox";
      else if (a.fieldType === "Btn" && a.radioButton) kind = "radio";
      else if (a.fieldType === "Ch") kind = a.combo ? "select" : "list";
      else if (a.fieldType === "Sig") kind = "signature";
      else continue;

      const [x1, y1] = vp.convertToViewportPoint(a.rect[0], a.rect[1]);
      const [x2, y2] = vp.convertToViewportPoint(a.rect[2], a.rect[3]);
      const name = a.fieldName;
      const exportValue = (kind === "radio" ? a.buttonValue : a.exportValue) ?? "Yes";
      const raw = a.fieldValue;

      widgets.push({
        id: a.id,
        name,
        label: a.alternativeText?.trim() || prettifyName(name),
        kind,
        page: i,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
        readOnly: !!a.readOnly,
        required: a.required ?? !!((a.fieldFlags ?? 0) & 2),
        multiline: !!a.multiLine,
        password: !!a.password,
        maxLen: a.maxLen ?? 0,
        comb: !!a.comb,
        fontSize: a.defaultAppearanceData?.fontSize ?? 0,
        align: (["left", "center", "right"] as const)[a.textAlignment ?? 0] ?? "left",
        exportValue,
        options: (a.options ?? []).map((o) => ({ value: o.exportValue, label: o.displayValue })),
        multiSelect: !!a.multiSelect,
      });

      if (name in values && kind !== "checkbox" && kind !== "radio") continue;
      switch (kind) {
        case "text":
          values[name] = typeof raw === "string" ? raw : "";
          break;
        case "checkbox":
        case "radio": {
          const on = typeof raw === "string" && raw !== "Off" && raw === exportValue;
          if (on) values[name] = exportValue;
          else values[name] ??= "";
          break;
        }
        case "select":
          values[name] = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
          break;
        case "list":
          values[name] = Array.isArray(raw) ? raw : raw ? [raw] : [];
          break;
        case "signature":
          values[name] = "";
          break;
      }
    }
  }
  return { widgets, values };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportInput {
  bytes: Uint8Array;
  doc: PDFDocumentProxy;
  widgets: FieldWidget[];
  values: Record<string, FieldValue>;
  initialValues: Record<string, FieldValue>;
  items: Item[];
  flatten: boolean;
}

export interface ExportResult {
  bytes: Uint8Array;
  warnings: string[];
}

function changed(a: FieldValue | undefined, b: FieldValue | undefined) {
  return JSON.stringify(a ?? "") !== JSON.stringify(b ?? "");
}

export async function exportPdf(input: ExportInput): Promise<ExportResult> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(input.bytes, { updateMetadata: false });
  } catch (e) {
    if (e instanceof EncryptedPDFError) return exportEncrypted(input);
    throw e;
  }

  const warnings: string[] = [];
  const fonts = new Map<FontFamily, PDFFont>();
  const font = async (f: FontFamily) => {
    if (!fonts.has(f)) {
      const std = { helvetica: StandardFonts.Helvetica, times: StandardFonts.TimesRoman, courier: StandardFonts.Courier }[f];
      fonts.set(f, await pdf.embedFont(std));
    }
    return fonts.get(f)!;
  };

  // --- Form fields ---------------------------------------------------------
  const form = pdf.getForm();
  const helv = await font("helvetica");
  let needAppearances = false;
  const failed: string[] = [];

  for (const [name, value] of Object.entries(input.values)) {
    if (!changed(value, input.initialValues[name])) continue;
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) {
        const text = String(value);
        field.setText(text || undefined);
        if (!canEncode(helv, text)) needAppearances = true;
        else field.updateAppearances(helv);
      } else if (field instanceof PDFCheckBox) {
        if (value) field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup) {
        if (value) field.select(String(value));
        else field.clear();
      } else if (field instanceof PDFDropdown) {
        if (value) field.select(String(value));
        else field.clear();
      } else if (field instanceof PDFOptionList) {
        const list = (value as string[]) ?? [];
        if (list.length) field.select(list);
        else field.clear();
      }
    } catch (e) {
      console.warn(`Could not set field "${name}"`, e);
      failed.push(name);
    }
  }
  if (failed.length) warnings.push(`${failed.length} field(s) could not be written: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`);
  if (needAppearances) {
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  // --- Placed items ----------------------------------------------------------
  const images = new Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>();
  const pdfPages = pdf.getPages();
  const viewports = new Map<number, ReturnType<PDFPageProxy["getViewport"]>>();

  for (const item of input.items) {
    const page = pdfPages[item.page];
    if (!page) continue;
    if (!viewports.has(item.page)) {
      viewports.set(item.page, (await input.doc.getPage(item.page + 1)).getViewport({ scale: 1 }));
    }
    const vp = viewports.get(item.page)!;
    const toPdf = (x: number, y: number) => {
      const [px, py] = vp.convertToPdfPoint(x, y);
      return { x: px, y: py };
    };
    const rotate = degrees(vp.rotation);

    switch (item.type) {
      case "text": {
        const f = await font(item.font);
        const lines = item.text.split("\n");
        lines.forEach((line, i) => {
          if (!line) return;
          const at = toPdf(
            item.x + TEXT_PAD,
            item.y + TEXT_PAD + (i * LINE_HEIGHT + BASELINE[item.font]) * item.fontSize,
          );
          page.drawText(sanitize(f, line), { ...at, size: item.fontSize, font: f, color: hex(item.color), rotate });
        });
        break;
      }
      case "image": {
        let img = images.get(item.src);
        if (!img) {
          img = await pdf.embedPng(item.src);
          images.set(item.src, img);
        }
        page.drawImage(img, { ...toPdf(item.x, item.y + item.h), width: item.w, height: item.h, rotate });
        break;
      }
      case "symbol": {
        page.drawSvgPath(SYMBOL_PATHS[item.symbol], {
          ...toPdf(item.x, item.y),
          scale: item.w / 24,
          borderColor: hex(item.color),
          borderWidth: SYMBOL_STROKE,
          borderLineCap: LineCapStyle.Round,
          rotate,
        });
        break;
      }
      case "rect": {
        page.drawRectangle({
          ...toPdf(item.x, item.y + item.h),
          width: item.w,
          height: item.h,
          color: hex(item.color),
          rotate,
          ...(item.kind === "highlight" ? { opacity: 0.45, blendMode: BlendMode.Multiply } : {}),
        });
        break;
      }
    }
  }

  if (input.flatten) {
    try {
      form.flatten({ updateFieldAppearances: !needAppearances });
    } catch (e) {
      console.warn("Flatten failed", e);
      warnings.push("The form could not be fully flattened.");
    }
  }

  const bytes = await pdf.save({ updateFieldAppearances: false });
  return { bytes, warnings };
}

/**
 * pdf-lib cannot write encrypted files, but pdf.js can save form values into them
 * (as an incremental update that keeps the encryption). Placed items are not supported there.
 */
async function exportEncrypted(input: ExportInput): Promise<ExportResult> {
  const warnings: string[] = [];
  const storage = input.doc.annotationStorage;
  for (const w of input.widgets) {
    const v = input.values[w.name];
    if (!changed(v, input.initialValues[w.name])) continue;
    switch (w.kind) {
      case "text":
        storage.setValue(w.id, { value: String(v ?? "") });
        break;
      case "checkbox":
      case "radio":
        storage.setValue(w.id, { value: v === w.exportValue });
        break;
      case "select":
        storage.setValue(w.id, { value: String(v ?? "") });
        break;
      case "list":
        storage.setValue(w.id, { value: (v as string[]) ?? [] });
        break;
    }
  }
  if (input.items.length) {
    warnings.push("This PDF is encrypted: form values were saved, but added text, signatures and marks could not be.");
  }
  if (input.flatten) warnings.push("Encrypted PDFs cannot be flattened.");
  const bytes = await input.doc.saveDocument();
  return { bytes, warnings };
}

/** "form1[0].Page1[0].FirstName_1[0]" -> "First name 1" */
function prettifyName(name: string) {
  const last = name.split(".").filter(Boolean).pop() ?? name;
  const words = last
    .replace(/\[\d+\]/g, "")
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

function canEncode(font: PDFFont, text: string) {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Replace characters the standard (WinAnsi) fonts can't encode. */
function sanitize(font: PDFFont, text: string) {
  if (canEncode(font, text)) return text;
  return [...text].map((ch) => (canEncode(font, ch) ? ch : "?")).join("");
}

function hex(color: string) {
  const n = parseInt(color.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
