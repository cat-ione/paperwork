# Paperwork

A desktop PDF editor for filling out forms and signing contracts. Built with Tauri 2, Svelte 5, pdf.js (rendering) and pdf-lib (saving).

**[Download](https://github.com/cat-ione/paperwork/releases/latest)** for Windows, macOS or Linux, or **[try it in your browser](https://cat-ione.github.io/paperwork/)**.

## Features

- **Fill form fields**: text, multiline, comb, checkboxes, radio buttons, dropdowns and list boxes, with a progress panel and "next empty field" navigation
- **Signatures and initials**: draw, type (4 handwriting fonts) or upload, saved for reuse. Clicking a signature field fits the signature into it.
- **Add text, dates, checkmarks/crosses, whiteout and highlights** anywhere on the page. Items can be moved, resized, restyled, duplicated and deleted.
- **Save** (keeps fields editable), **Save as**, or **Save flattened copy** (locks everything in place)
- Undo/redo, zoom (Ctrl+wheel / pinch), page thumbnails, light/dark theme, recent files, drag & drop, "Open with" support, and a prompt when closing with unsaved changes
- Password-protected and encrypted PDFs: form values are saved through pdf.js. Placed items can't be added to these files.

## Development

```sh
pnpm install
pnpm tauri dev      # run the desktop app
pnpm tauri build    # build installers
pnpm check          # type-check
```

`pnpm dev` also runs the UI in a plain browser. There, saving downloads the file.

## Releasing

Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, then push a tag:

```sh
git tag v0.2.0 && git push origin v0.2.0
```

The release workflow builds installers for Windows, macOS (Apple Silicon and Intel) and Linux and publishes them as a GitHub release. Each push to `main` also redeploys the browser version to GitHub Pages.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Ctrl+O / Ctrl+S / Ctrl+Shift+S | Open / Save / Save as |
| V T S I D X W H | Select, Text, Sign, Initials, Date, Check, Whiteout, Highlight |
| Del, Arrows (Shift = 10pt), Ctrl+D | Delete, nudge, duplicate the selected item |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+= / Ctrl+- / Ctrl+0 | Zoom in / out / fit width |
| Esc | Cancel tool / deselect |

## Notes

- Placed text uses the PDF standard fonts (Helvetica/Times/Courier). The editor previews it with the metric-compatible Arimo/Tinos/Cousine, so what you see is where it lands. These fonts only cover Western (WinAnsi) characters, so other characters are saved as `?`.
