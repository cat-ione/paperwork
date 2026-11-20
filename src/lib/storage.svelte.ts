// Per-user preferences persisted in localStorage: saved signatures, recent files, theme.
import type { SavedSignature } from "./types";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable; preferences just won't persist
  }
}

export interface RecentFile {
  path: string;
  name: string;
  openedAt: number;
}

export type Theme = "system" | "light" | "dark";

class Prefs {
  signatures = $state<SavedSignature[]>(load("paperwork.signatures", []));
  recent = $state<RecentFile[]>(load("paperwork.recent", []));
  theme = $state<Theme>(load("paperwork.theme", "system"));
  typedName = $state<string>(load("paperwork.typedName", ""));

  addSignature(sig: SavedSignature) {
    this.signatures = [sig, ...this.signatures.filter((s) => s.src !== sig.src)].slice(0, 8);
    persist("paperwork.signatures", this.signatures);
  }

  removeSignature(id: string) {
    this.signatures = this.signatures.filter((s) => s.id !== id);
    persist("paperwork.signatures", this.signatures);
  }

  addRecent(path: string, name: string) {
    this.recent = [{ path, name, openedAt: Date.now() }, ...this.recent.filter((r) => r.path !== path)].slice(0, 8);
    persist("paperwork.recent", this.recent);
  }

  removeRecent(path: string) {
    this.recent = this.recent.filter((r) => r.path !== path);
    persist("paperwork.recent", this.recent);
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    persist("paperwork.theme", theme);
  }

  setTypedName(name: string) {
    this.typedName = name;
    persist("paperwork.typedName", name);
  }
}

export const prefs = new Prefs();
