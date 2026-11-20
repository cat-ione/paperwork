<script lang="ts">
  import { onMount } from "svelte";
  import { FileUp } from "@lucide/svelte";
  import { editor } from "./lib/editor.svelte";
  import { prefs } from "./lib/storage.svelte";
  import { toasts } from "./lib/toast.svelte";
  import {
    confirmDialog,
    fromBrowserFile,
    inTauri,
    initialFile,
    pickPdf,
    readFile,
    setWindowTitle,
  } from "./lib/platform";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import Thumbnails from "./lib/components/Thumbnails.svelte";
  import Viewer from "./lib/components/Viewer.svelte";
  import FieldsPanel from "./lib/components/FieldsPanel.svelte";
  import Welcome from "./lib/components/Welcome.svelte";
  import SignatureDialog from "./lib/components/SignatureDialog.svelte";
  import PasswordDialog from "./lib/components/PasswordDialog.svelte";
  import Toasts from "./lib/components/Toasts.svelte";

  let dragging = $state(false);

  // Theme
  $effect(() => {
    const root = document.documentElement;
    if (prefs.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
  });

  // Window title
  $effect(() => {
    const title = editor.doc ? `${editor.dirty ? "• " : ""}${editor.fileName} — Paperwork` : "Paperwork";
    setWindowTitle(title).catch(() => {});
  });

  /** Ask before discarding unsaved changes. Returns true if it's OK to continue. */
  async function confirmDiscard() {
    if (!editor.doc || !editor.dirty) return true;
    return confirmDialog(
      `You have unsaved changes in "${editor.fileName}". Discard them?`,
      "Unsaved changes",
      "Discard",
    );
  }

  async function openFile() {
    if (!(await confirmDiscard())) return;
    const file = await pickPdf().catch((e) => {
      toasts.show("error", String(e));
      return null;
    });
    if (file) await editor.open(file);
  }

  async function openPath(path: string) {
    if (!(await confirmDiscard())) return;
    try {
      await editor.open(await readFile(path));
    } catch (e) {
      prefs.removeRecent(path);
      toasts.show("error", String(e));
    }
  }

  async function closeFile() {
    if (await confirmDiscard()) await editor.close();
  }

  onMount(() => {
    const cleanups: (() => void)[] = [];

    if (inTauri) {
      (async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");

        const initial = await initialFile();
        if (initial) openPath(initial);

        cleanups.push(
          await getCurrentWebview().onDragDropEvent((e) => {
            const p = e.payload;
            if (p.type === "enter" || p.type === "over") dragging = true;
            else if (p.type === "leave") dragging = false;
            else if (p.type === "drop") {
              dragging = false;
              const pdf = p.paths.find((path) => path.toLowerCase().endsWith(".pdf"));
              if (pdf) openPath(pdf);
              else if (p.paths.length) toasts.show("error", "Only PDF files can be opened.");
            }
          }),
        );

        cleanups.push(
          await getCurrentWindow().onCloseRequested(async (e) => {
            if (!(await confirmDiscard())) e.preventDefault();
          }),
        );
      })();
    } else {
      window.addEventListener("beforeunload", (e) => {
        if (editor.dirty) e.preventDefault();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  });

  // Browser drag & drop (Tauri delivers file drops through onDragDropEvent instead)
  function onDragOver(e: DragEvent) {
    if (inTauri || !e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    dragging = true;
  }
  async function onDrop(e: DragEvent) {
    if (inTauri) return;
    e.preventDefault();
    dragging = false;
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (file && (await confirmDiscard())) editor.open(await fromBrowserFile(file));
  }

  function isTyping(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (editor.signatureDialog || editor.passwordPrompt) return;
    if (mod && key === "o") return e.preventDefault(), openFile();
    if (!editor.doc) return;

    if (mod && key === "s") return e.preventDefault(), editor.save(e.shiftKey ? "saveAs" : "save");
    if (mod && key === "w") return e.preventDefault(), closeFile();
    if (mod && (key === "=" || key === "+")) return e.preventDefault(), editor.zoomIn();
    if (mod && key === "-") return e.preventDefault(), editor.zoomOut();
    if (mod && key === "0") return e.preventDefault(), editor.fitWidth();

    const typing = isTyping(e.target);
    if (mod && key === "z" && !typing) return e.preventDefault(), e.shiftKey ? editor.redo() : editor.undo();
    if (mod && key === "y" && !typing) return e.preventDefault(), editor.redo();
    if (mod && key === "d" && editor.selectedId) return e.preventDefault(), editor.duplicate(editor.selectedId);

    if (key === "escape") {
      if (editor.signaturePicker) editor.signaturePicker = null;
      else if (editor.tool !== "select") editor.setTool("select");
      else if (typing) (e.target as HTMLElement).blur();
      else editor.selectedId = null;
      return;
    }

    if (typing || mod || e.altKey) return;

    if ((key === "delete" || key === "backspace") && editor.selectedId) {
      e.preventDefault();
      editor.remove(editor.selectedId);
      return;
    }

    const sel = editor.selected;
    if (sel && key.startsWith("arrow")) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
      const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
      editor.update(sel.id, { x: sel.x + dx, y: sel.y + dy });
      return;
    }

    const tools: Record<string, Parameters<typeof editor.setTool>[0]> = {
      v: "select",
      t: "text",
      s: "signature",
      i: "initials",
      d: "date",
      x: "check",
      w: "whiteout",
      h: "highlight",
    };
    if (tools[key]) {
      e.preventDefault();
      if (tools[key] === "signature" || tools[key] === "initials") editor.startSigning(null, tools[key]);
      else editor.setTool(tools[key]);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} ondragover={onDragOver} ondragleave={() => (dragging = false)} ondrop={onDrop} />

<div class="app">
  {#if editor.doc}
    <Toolbar onOpen={openFile} onClose={closeFile} />
    <div class="workspace">
      {#if editor.showThumbnails}
        <Thumbnails />
      {/if}
      <Viewer />
      {#if editor.showFieldsPanel}
        <FieldsPanel />
      {/if}
    </div>
  {:else}
    <Welcome onOpen={openFile} onOpenPath={openPath} />
  {/if}
</div>

{#if dragging}
  <div class="drop-overlay">
    <div class="drop-card">
      <FileUp size={36} strokeWidth={1.6} />
      <div class="drop-title">Drop to open</div>
      <div class="drop-sub">Release to open the PDF</div>
    </div>
  </div>
{/if}

{#if editor.signatureDialog}
  <SignatureDialog kind={editor.signatureDialog} />
{/if}

{#if editor.passwordPrompt}
  <PasswordDialog prompt={editor.passwordPrompt} />
{/if}

<Toasts />

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .workspace {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    backdrop-filter: blur(3px);
    animation: fade-in 0.12s;
    pointer-events: none;
  }
  .drop-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 36px 56px;
    border-radius: 20px;
    border: 2px dashed var(--accent);
    background: var(--surface);
    color: var(--accent-text);
    box-shadow: var(--shadow-lg);
  }
  .drop-title {
    margin-top: 6px;
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }
  .drop-sub {
    color: var(--text-3);
  }
</style>
