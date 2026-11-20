// Copies the pdf.js runtime assets (cmaps, standard fonts, wasm decoders, ICC profiles)
// into public/pdfjs so they are served locally and bundled with the app.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const out = join(import.meta.dirname, "..", "public", "pdfjs");

for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  const src = join(root, dir);
  if (!existsSync(src)) continue;
  mkdirSync(join(out, dir), { recursive: true });
  cpSync(src, join(out, dir), { recursive: true });
}
