import { exportPdf, extractFields, loadPdf, pageInfo, TEXT_PAD, LINE_HEIGHT, type PDFDocumentProxy } from "./pdf";
import { baseName, inTauri, pickSavePath, writeFile, type OpenedFile } from "./platform";
import { prefs } from "./storage.svelte";
import { toasts } from "./toast.svelte";
import type { FieldValue, FieldWidget, Item, PageInfo, SavedSignature, TextItem, Tool } from "./types";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export const INK_COLORS = ["#111111", "#1d4ed8", "#b91c1c", "#047857"];

export type SaveMode = "save" | "saveAs" | "flatten";

interface Snapshot {
  items: Item[];
  values: Record<string, FieldValue>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function isFilled(v: FieldValue | undefined) {
  return Array.isArray(v) ? v.length > 0 : !!v;
}

class Editor {
  // --- document ---
  doc = $state.raw<PDFDocumentProxy | null>(null);
  bytes: Uint8Array | null = null;
  fileName = $state("");
  filePath = $state<string | null>(null);
  pages = $state.raw<PageInfo[]>([]);
  widgets = $state.raw<FieldWidget[]>([]);
  values = $state<Record<string, FieldValue>>({});
  initialValues: Record<string, FieldValue> = {};
  items = $state<Item[]>([]);
  loading = $state(false);
  saving = $state(false);

  // --- interaction ---
  tool = $state<Tool>("select");
  selectedId = $state<string | null>(null);
  /** Item whose text should receive focus once it mounts. */
  focusItemId = $state<string | null>(null);
  /** Signature/initials waiting to be placed with the next click. */
  pending = $state<SavedSignature | null>(null);
  /** Signature form field the next signature should be fitted into. */
  signTarget = $state<FieldWidget | null>(null);
  signatureDialog = $state<"signature" | "initials" | null>(null);
  signaturePicker = $state<"signature" | "initials" | null>(null);
  passwordPrompt = $state<{ retry: boolean; resolve: (pw: string | null) => void } | null>(null);

  // --- defaults for new items (remembered between placements) ---
  textDefaults = $state({ fontSize: 12, font: "helvetica" as TextItem["font"], color: INK_COLORS[0] });
  symbolSize = $state(14);

  // --- view ---
  zoom = $state(1);
  currentPage = $state(0);
  showThumbnails = $state(true);
  showFieldsPanel = $state(true);
  highlightFields = $state(true);
  scroller: HTMLElement | null = null;
  pageEls: (HTMLElement | null)[] = [];
  fieldEls = new Map<string, HTMLElement>();

  // --- history ---
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastSnapshot = "";
  private savedSnapshot = "";
  canUndo = $state(false);
  canRedo = $state(false);
  dirty = $state(false);

  selected = $derived(this.items.find((i) => i.id === this.selectedId) ?? null);

  /** Unique fields that count toward "progress" (checkboxes are optional by nature). */
  progressFields = $derived.by(() => {
    const seen = new Map<string, FieldWidget>();
    for (const w of this.widgets) {
      if (w.readOnly || w.kind === "checkbox" || w.kind === "signature") continue;
      if (!seen.has(w.name)) seen.set(w.name, w);
    }
    return [...seen.values()];
  });
  filledCount = $derived(this.progressFields.filter((w) => isFilled(this.values[w.name])).length);
  missingRequired = $derived(
    this.progressFields.filter((w) => w.required && !isFilled(this.values[w.name])),
  );

  // -------------------------------------------------------------------------
  // Document lifecycle
  // -------------------------------------------------------------------------

  async open(file: OpenedFile) {
    this.loading = true;
    try {
      const doc = await loadPdf(file.bytes, (retry) => {
        return new Promise((resolve) => {
          this.passwordPrompt = {
            retry,
            resolve: (pw) => {
              this.passwordPrompt = null;
              resolve(pw);
            },
          };
        });
      });
      const pages: PageInfo[] = [];
      for (let i = 1; i <= doc.numPages; i++) pages.push(pageInfo(await doc.getPage(i)));
      const { widgets, values } = await extractFields(doc);

      await this.doc?.loadingTask.destroy();
      this.doc = doc;
      this.bytes = file.bytes;
      this.fileName = file.name;
      this.filePath = file.path;
      this.pages = pages;
      this.widgets = widgets;
      this.initialValues = structuredClone(values);
      this.values = values;
      this.items = [];
      this.selectedId = null;
      this.pending = null;
      this.tool = "select";
      this.currentPage = 0;
      this.pageEls = [];
      this.fieldEls.clear();
      this.resetHistory();
      if (file.path) prefs.addRecent(file.path, file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/destroyed|cancel/i.test(msg)) toasts.show("error", `Couldn't open ${file.name}: ${msg}`);
    } finally {
      this.loading = false;
      this.passwordPrompt = null;
    }
  }

  async close() {
    await this.doc?.loadingTask.destroy();
    this.doc = null;
    this.bytes = null;
    this.pages = [];
    this.widgets = [];
    this.items = [];
    this.values = {};
    this.fileName = "";
    this.filePath = null;
    this.selectedId = null;
    this.resetHistory();
  }

  async save(mode: SaveMode = "save") {
    if (!this.doc || !this.bytes || this.saving) return;
    const stem = this.fileName.replace(/\.pdf$/i, "");
    let path = mode === "save" ? this.filePath : null;
    if (!path) {
      const suggestion =
        mode === "flatten" ? `${stem} (flattened).pdf` : inTauri ? this.fileName : `${stem} (filled).pdf`;
      const dir = this.filePath ? this.filePath.slice(0, this.filePath.length - this.fileName.length) : "";
      path = await pickSavePath(dir + suggestion);
      if (!path) return;
    }

    this.saving = true;
    try {
      const { bytes, warnings } = await exportPdf({
        bytes: this.bytes,
        doc: this.doc,
        widgets: this.widgets,
        values: $state.snapshot(this.values),
        initialValues: this.initialValues,
        items: $state.snapshot(this.items),
        flatten: mode === "flatten",
      });
      await writeFile(path, bytes);
      if (mode !== "flatten") {
        if (inTauri) {
          this.filePath = path;
          this.fileName = baseName(path);
          prefs.addRecent(path, this.fileName);
        }
        this.savedSnapshot = this.lastSnapshot;
        this.dirty = false;
      }
      toasts.show("success", inTauri ? `Saved ${baseName(path)}` : `Downloaded ${baseName(path)}`);
      for (const w of warnings) toasts.show("info", w, 8000);
    } catch (e) {
      console.error(e);
      toasts.show("error", `Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      this.saving = false;
    }
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  private snapshot(): string {
    return JSON.stringify({ items: $state.snapshot(this.items), values: $state.snapshot(this.values) });
  }

  private resetHistory() {
    this.undoStack = [];
    this.redoStack = [];
    this.lastSnapshot = this.savedSnapshot = this.snapshot();
    this.canUndo = this.canRedo = false;
    this.dirty = false;
  }

  /** Record the current state as an undo step if anything changed since the last checkpoint. */
  checkpoint() {
    const snap = this.snapshot();
    if (snap === this.lastSnapshot) return;
    if (this.undoStack.at(-1) === snap) {
      // Back to the previous state (e.g. an empty text box was discarded): collapse the step.
      this.undoStack.pop();
      this.lastSnapshot = snap;
      this.syncHistoryFlags();
      return;
    }
    this.undoStack.push(this.lastSnapshot);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    this.lastSnapshot = snap;
    this.syncHistoryFlags();
  }

  /** Mark the document as changed without creating an undo step yet (e.g. while typing). */
  touch() {
    this.dirty = true;
  }

  undo() {
    this.checkpoint();
    const prev = this.undoStack.pop();
    if (prev === undefined) return;
    this.redoStack.push(this.lastSnapshot);
    this.restore(prev);
  }

  redo() {
    const next = this.redoStack.pop();
    if (next === undefined) return;
    this.undoStack.push(this.lastSnapshot);
    this.restore(next);
  }

  private restore(snap: string) {
    const s = JSON.parse(snap) as Snapshot;
    this.items = s.items;
    this.values = s.values;
    this.lastSnapshot = snap;
    if (!this.items.some((i) => i.id === this.selectedId)) this.selectedId = null;
    this.syncHistoryFlags();
  }

  private syncHistoryFlags() {
    this.canUndo = this.undoStack.length > 0;
    this.canRedo = this.redoStack.length > 0;
    this.dirty = this.lastSnapshot !== this.savedSnapshot;
  }

  // -------------------------------------------------------------------------
  // Form fields
  // -------------------------------------------------------------------------

  setValue(name: string, value: FieldValue, commit = true) {
    this.values[name] = value;
    if (commit) this.checkpoint();
    else this.touch();
  }

  clearFields() {
    for (const name of Object.keys(this.values)) {
      const v = this.values[name];
      this.values[name] = Array.isArray(v) ? [] : "";
    }
    this.checkpoint();
  }

  focusField(w: FieldWidget) {
    const el = this.fieldEls.get(w.id);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
    if (w.kind === "signature") this.startSigning(w);
  }

  /** Jump to the next empty field that counts toward progress. */
  nextEmptyField() {
    const missing = this.missingRequired[0] ?? this.progressFields.find((w) => !isFilled(this.values[w.name]));
    if (missing) this.focusField(missing);
    else toasts.show("success", "All fields are filled in.");
  }

  // -------------------------------------------------------------------------
  // Items
  // -------------------------------------------------------------------------

  setTool(tool: Tool) {
    if (tool === "signature" || tool === "initials") {
      this.signaturePicker = this.signaturePicker === tool ? null : tool;
      return;
    }
    this.signaturePicker = null;
    this.pending = null;
    this.signTarget = null;
    this.tool = tool;
    if (tool !== "select") this.selectedId = null;
  }

  startSigning(target: FieldWidget | null = null, kind: "signature" | "initials" = "signature") {
    this.signTarget = target;
    const saved = prefs.signatures.filter((s) => s.kind === kind);
    if (saved.length) this.signaturePicker = kind;
    else this.signatureDialog = kind;
  }

  /** Called once a signature/initials has been chosen or created. */
  useSignature(sig: SavedSignature) {
    this.signaturePicker = null;
    this.signatureDialog = null;
    const target = this.signTarget;
    this.signTarget = null;
    if (target) {
      // Fit inside the signature field, keeping the aspect ratio.
      const scale = Math.min((target.w * 0.95) / sig.width, (target.h * 0.9) / sig.height);
      const w = sig.width * scale;
      const h = sig.height * scale;
      this.add({
        id: uid(),
        type: "image",
        kind: sig.kind,
        src: sig.src,
        page: target.page,
        x: target.x + (target.w - w) / 2,
        y: target.y + (target.h - h) / 2,
        w,
        h,
      });
      this.tool = "select";
      return;
    }
    this.pending = sig;
    this.tool = sig.kind;
  }

  /** Default size of a signature/initials when placed by clicking. */
  signatureSize(sig: SavedSignature) {
    const h = sig.kind === "signature" ? 42 : 30;
    const w = Math.min(sig.width * (h / sig.height), sig.kind === "signature" ? 220 : 90);
    return { w, h: sig.height * (w / sig.width) };
  }

  /** Place an item for the active tool, centered on the given point (view units). */
  placeAt(page: number, x: number, y: number) {
    const tool = this.tool;
    const p = this.pages[page];
    const base = { id: uid(), page };

    switch (tool) {
      case "text":
      case "date": {
        const { fontSize, font, color } = this.textDefaults;
        const text = tool === "date" ? new Date().toLocaleDateString() : "";
        const h = fontSize * LINE_HEIGHT + TEXT_PAD * 2;
        const item: TextItem = { ...base, type: "text", text, fontSize, font, color, x: x - TEXT_PAD, y: y - h / 2, w: 40, h };
        this.add(item);
        if (tool === "text") this.focusItemId = item.id;
        break;
      }
      case "check":
      case "cross": {
        const s = this.symbolSize;
        this.add({ ...base, type: "symbol", symbol: tool, color: this.textDefaults.color, x: x - s / 2, y: y - s / 2, w: s, h: s });
        break;
      }
      case "signature":
      case "initials": {
        const sig = this.pending;
        if (!sig) return;
        const { w, h } = this.signatureSize(sig);
        this.add({ ...base, type: "image", kind: sig.kind, src: sig.src, x: x - w / 2, y: y - h / 2, w, h });
        this.pending = null;
        break;
      }
      default:
        return;
    }

    const added = this.items[this.items.length - 1];
    if (p) this.clampToPage(added);
    this.tool = "select";
  }

  add(item: Item) {
    this.items.push(item);
    this.selectedId = item.id;
    this.checkpoint();
  }

  update(id: string, patch: Partial<Item>, commit = true) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    Object.assign(item, patch);
    if (commit) this.checkpoint();
    else this.touch();
  }

  remove(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.checkpoint();
  }

  duplicate(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    const copy = { ...$state.snapshot(item), id: uid(), x: item.x + 12, y: item.y + 12 } as Item;
    this.clampToPage(copy);
    this.add(copy);
  }

  clampToPage(item: Item) {
    const p = this.pages[item.page];
    if (!p) return;
    item.x = Math.max(0, Math.min(item.x, p.width - Math.min(item.w, p.width)));
    item.y = Math.max(0, Math.min(item.y, p.height - Math.min(item.h, p.height)));
  }

  /** Change text style of the selected item and remember it for new text. */
  styleText(patch: Partial<Pick<TextItem, "fontSize" | "font" | "color">>) {
    const sel = this.selected;
    if (sel?.type === "text") this.update(sel.id, patch);
    else if (sel?.type === "symbol" && patch.color) this.update(sel.id, { color: patch.color });
    Object.assign(this.textDefaults, patch);
  }

  // -------------------------------------------------------------------------
  // View
  // -------------------------------------------------------------------------

  setZoom(z: number, anchor?: { x: number; y: number }) {
    const el = this.scroller;
    const next = Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) * 1000) / 1000;
    if (!el || next === this.zoom) {
      this.zoom = next;
      return;
    }
    // Keep the point under the anchor (default: viewport center) stationary.
    const ax = anchor?.x ?? el.clientWidth / 2;
    const ay = anchor?.y ?? el.clientHeight / 2;
    const ratio = next / this.zoom;
    const sx = (el.scrollLeft + ax) * ratio - ax;
    const sy = (el.scrollTop + ay) * ratio - ay;
    this.zoom = next;
    requestAnimationFrame(() => el.scrollTo({ left: sx, top: sy }));
  }

  zoomIn() {
    this.setZoom(ZOOM_STEPS.find((s) => s > this.zoom + 0.001) ?? MAX_ZOOM);
  }

  zoomOut() {
    this.setZoom([...ZOOM_STEPS].reverse().find((s) => s < this.zoom - 0.001) ?? MIN_ZOOM);
  }

  fitWidth() {
    const el = this.scroller;
    const widest = Math.max(...this.pages.map((p) => p.width), 1);
    if (el) this.setZoom((el.clientWidth - 64) / widest);
  }

  fitPage() {
    const el = this.scroller;
    const p = this.pages[this.currentPage];
    if (el && p) this.setZoom(Math.min((el.clientWidth - 64) / p.width, (el.clientHeight - 48) / p.height));
    requestAnimationFrame(() => this.goToPage(this.currentPage, "instant"));
  }

  goToPage(index: number, behavior: ScrollBehavior = "smooth") {
    const el = this.pageEls[index];
    if (!el || !this.scroller) return;
    this.scroller.scrollTo({ top: el.offsetTop - 24, behavior });
    this.currentPage = index;
  }
}

export const editor = new Editor();
