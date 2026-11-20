export type Tool =
  | "select"
  | "text"
  | "signature"
  | "initials"
  | "date"
  | "check"
  | "cross"
  | "circle"
  | "whiteout"
  | "highlight";

export type FontFamily = "helvetica" | "times" | "courier";

/** All item geometry is in page "view" units: PDF points at zoom 1, top-left origin, page rotation applied. */
interface ItemBase {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextItem extends ItemBase {
  type: "text";
  text: string;
  fontSize: number;
  font: FontFamily;
  color: string;
}

export interface ImageItem extends ItemBase {
  type: "image";
  kind: "signature" | "initials";
  src: string; // PNG data URL
}

export interface SymbolItem extends ItemBase {
  type: "symbol";
  symbol: "check" | "cross";
  color: string;
}

export interface RectItem extends ItemBase {
  type: "rect";
  kind: "whiteout" | "highlight";
  color: string;
}

/** Outline ellipse for circling things. The stroke is drawn inside the box. */
export interface EllipseItem extends ItemBase {
  type: "ellipse";
  color: string;
  strokeWidth: number;
}

export type Item = TextItem | ImageItem | SymbolItem | RectItem | EllipseItem;

export interface PageInfo {
  index: number;
  /** Size in view units (points, rotation applied). */
  width: number;
  height: number;
  rotation: number;
}

export type FieldKind = "text" | "checkbox" | "radio" | "select" | "list" | "signature";

/** One on-page widget of an AcroForm field. Several widgets can share a field name. */
export interface FieldWidget {
  id: string;
  name: string;
  /** Human-readable label (tooltip text or a cleaned-up field name). */
  label: string;
  kind: FieldKind;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  readOnly: boolean;
  required: boolean;
  multiline: boolean;
  password: boolean;
  maxLen: number;
  comb: boolean;
  fontSize: number; // 0 = auto
  align: "left" | "center" | "right";
  /** Value this widget represents when "on" (checkboxes / radios). */
  exportValue: string;
  options: { value: string; label: string }[];
  multiSelect: boolean;
}

/** text/select: string; checkbox/radio: the selected export value, or "" when off; list: string[] */
export type FieldValue = string | string[];

export interface SavedSignature {
  id: string;
  kind: "signature" | "initials";
  src: string;
  width: number;
  height: number;
}
