// Thin wrapper over file I/O so the UI also works in a plain browser during development.
import { invoke, isTauri } from "@tauri-apps/api/core";

export const inTauri = isTauri();

export interface OpenedFile {
  name: string;
  path: string | null;
  bytes: Uint8Array;
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export async function readFile(path: string): Promise<OpenedFile> {
  const buf = await invoke<ArrayBuffer>("read_file", { path });
  return { name: baseName(path), path, bytes: new Uint8Array(buf) };
}

export async function pickPdf(): Promise<OpenedFile | null> {
  if (inTauri) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF documents", extensions: ["pdf"] }],
    });
    return path ? readFile(path) : null;
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await fromBrowserFile(file) : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function fromBrowserFile(file: File): Promise<OpenedFile> {
  return { name: file.name, path: null, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function pickSavePath(suggestedName: string): Promise<string | null> {
  if (!inTauri) return suggestedName;
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({
    defaultPath: suggestedName,
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
  });
}

export async function writeFile(path: string, bytes: Uint8Array): Promise<void> {
  if (!inTauri) {
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = baseName(path);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    return;
  }
  await invoke("write_file", bytes, { headers: { "x-path": encodeURIComponent(path) } });
}

export async function confirmDialog(message: string, title: string, okLabel: string): Promise<boolean> {
  if (!inTauri) return window.confirm(message);
  const { ask } = await import("@tauri-apps/plugin-dialog");
  return ask(message, { title, kind: "warning", okLabel, cancelLabel: "Cancel" });
}

export async function initialFile(): Promise<string | null> {
  if (!inTauri) return null;
  return invoke<string | null>("initial_file");
}

export async function setWindowTitle(title: string) {
  document.title = title;
  if (!inTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setTitle(title);
}
