<script lang="ts">
  import {
    CalendarDays,
    Check,
    ChevronDown,
    Download,
    Eraser,
    FileLock2,
    FilePlus2,
    FolderOpen,
    Highlighter,
    LoaderCircle,
    Monitor,
    Moon,
    MousePointer2,
    PanelLeft,
    PanelRight,
    PenLine,
    Redo2,
    Save,
    SquarePen,
    Sun,
    Type,
    Undo2,
    X,
  } from "@lucide/svelte";
  import type { Component } from "svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import { prefs } from "../storage.svelte";
  import type { Tool } from "../types";
  import SignaturePicker from "./SignaturePicker.svelte";
  import Logo from "./Logo.svelte";

  let { onOpen, onClose }: { onOpen: () => void; onClose: () => void } = $props();

  let saveMenu = $state(false);

  const tools: { id: Tool; label: string; key: string; icon: Component<any> }[] = [
    { id: "select", label: "Select", key: "V", icon: MousePointer2 },
    { id: "text", label: "Text", key: "T", icon: Type },
    { id: "signature", label: "Sign", key: "S", icon: PenLine },
    { id: "initials", label: "Initials", key: "I", icon: SquarePen },
    { id: "date", label: "Date", key: "D", icon: CalendarDays },
    { id: "check", label: "Check", key: "X", icon: Check },
    { id: "cross", label: "Cross", key: "C", icon: X },
    { id: "whiteout", label: "Whiteout", key: "W", icon: Eraser },
    { id: "highlight", label: "Highlight", key: "H", icon: Highlighter },
  ];

  function pick(id: Tool) {
    if (id === "signature" || id === "initials") {
      if (editor.signaturePicker === id) editor.signaturePicker = null;
      else editor.startSigning(null, id);
    } else editor.setTool(id);
  }

  function isActive(id: Tool) {
    if (id === "signature" || id === "initials") return editor.tool === id || editor.signaturePicker === id;
    return editor.tool === id;
  }

  const themeOrder = ["system", "light", "dark"] as const;
  function cycleTheme() {
    prefs.setTheme(themeOrder[(themeOrder.indexOf(prefs.theme) + 1) % themeOrder.length]);
  }

  function save(mode: Parameters<typeof editor.save>[0]) {
    saveMenu = false;
    editor.save(mode);
  }
</script>

<svelte:window onpointerdown={() => (saveMenu = false)} />

<header class="toolbar">
  <div class="left">
    <div class="brand">
      <Logo size={30} />
      <span class="wordmark display">Paperwork</span>
    </div>
    <span class="vrule"></span>
    <button class="icon-btn" data-tip="Open… Ctrl+O" aria-label="Open a PDF" onclick={onOpen}><FolderOpen size={18} /></button>
    <div class="file-tab" title={editor.filePath ?? editor.fileName}>
      <span class="name">{editor.fileName}</span>
      <button class="tab-close" aria-label="Close document" title="Close (Ctrl+W)" onclick={onClose}>
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
    {#if editor.dirty}
      <span class="unsaved" title="You have unsaved changes">Unsaved</span>
    {/if}
  </div>

  <div class="tray" role="toolbar" aria-label="Tools">
    {#each tools as t, i (t.id)}
      {#if i === 1 || i === 5 || i === 7}<span class="groove"></span>{/if}
      <div class="key-wrap">
        <button
          class="key"
          class:active={isActive(t.id)}
          aria-pressed={isActive(t.id)}
          aria-label={t.label}
          data-tip={t.label}
          onclick={() => pick(t.id)}
          onpointerdown={(e) => e.stopPropagation()}
        >
          <span class="cap">{t.key}</span>
          <t.icon size={18} strokeWidth={t.id === "check" || t.id === "cross" ? 2.6 : 1.9} />
        </button>
        {#if (t.id === "signature" || t.id === "initials") && editor.signaturePicker === t.id}
          <SignaturePicker kind={t.id} />
        {/if}
      </div>
    {/each}
  </div>

  <div class="right">
    <button class="icon-btn" data-tip="Undo Ctrl+Z" aria-label="Undo" disabled={!editor.canUndo} onclick={() => editor.undo()}>
      <Undo2 size={18} />
    </button>
    <button class="icon-btn" data-tip="Redo Ctrl+Y" aria-label="Redo" disabled={!editor.canRedo} onclick={() => editor.redo()}>
      <Redo2 size={18} />
    </button>
    <span class="vrule"></span>
    <button class="icon-btn" data-tip="Theme: {prefs.theme}" aria-label="Change theme" onclick={cycleTheme}>
      {#if prefs.theme === "light"}<Sun size={18} />{:else if prefs.theme === "dark"}<Moon size={18} />{:else}<Monitor size={18} />{/if}
    </button>
    <button
      class="icon-btn"
      class:active={editor.showThumbnails}
      data-tip="Pages"
      aria-label="Toggle pages panel"
      onclick={() => (editor.showThumbnails = !editor.showThumbnails)}
    >
      <PanelLeft size={18} />
    </button>
    <button
      class="icon-btn"
      class:active={editor.showFieldsPanel}
      data-tip="Checklist"
      aria-label="Toggle checklist panel"
      onclick={() => (editor.showFieldsPanel = !editor.showFieldsPanel)}
    >
      <PanelRight size={18} />
    </button>

    <div class="stamp" onpointerdown={(e) => e.stopPropagation()} role="group" aria-label="Save">
      <button class="stamp-main" disabled={editor.saving} onclick={() => save("save")}>
        {#if editor.saving}
          <LoaderCircle size={15} class="spin" />
        {:else if inTauri}
          <Save size={15} />
        {:else}
          <Download size={15} />
        {/if}
        <span class="stamp-label">{inTauri ? "Save" : "Download"}</span>
      </button>
      <button class="stamp-more" aria-label="More save options" disabled={editor.saving} onclick={() => (saveMenu = !saveMenu)}>
        <ChevronDown size={15} strokeWidth={2.5} />
      </button>
      {#if saveMenu}
        <div class="popover save-menu">
          <div class="menu-head mono-label">File it as…</div>
          <button class="menu-item" onclick={() => save("save")}>
            <Save size={17} />
            <span>{inTauri ? "Save" : "Download"}<span class="sub">Form fields stay editable</span></span>
            <span class="hint">Ctrl S</span>
          </button>
          {#if inTauri}
            <button class="menu-item" onclick={() => save("saveAs")}>
              <FilePlus2 size={17} />
              <span>Save a copy…<span class="sub">Keep the original untouched</span></span>
              <span class="hint">Ctrl ⇧ S</span>
            </button>
          {/if}
          <button class="menu-item" onclick={() => save("flatten")}>
            <FileLock2 size={17} />
            <span>Flattened copy…<span class="sub">Everything locked in place, ready to send</span></span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(max-content, 1fr);
    align-items: center;
    gap: 14px;
    height: 62px;
    padding: 0 14px;
    background: var(--surface) var(--grain);
    border-bottom: 1px solid var(--border-strong);
    box-shadow: 0 3px 0 -2px var(--border);
    position: relative;
    z-index: 20;
  }
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .right {
    justify-content: flex-end;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    flex: none;
  }
  .wordmark {
    font-size: 21px;
    font-style: italic;
    font-weight: 540;
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 36;
    letter-spacing: -0.02em;
  }
  .vrule {
    flex: none;
    width: 1px;
    height: 26px;
    margin: 0 8px;
    background: var(--border-strong);
    box-shadow: 1px 0 0 var(--surface);
  }

  /* The open document, shown as a manila folder tab. */
  .file-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 32px;
    margin-left: 2px;
    padding: 0 26px 0 12px;
    background: linear-gradient(var(--manila), var(--manila-dark));
    color: var(--manila-ink);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 100%, 0 100%);
    border-radius: 6px 0 0 0;
    font-weight: 600;
    font-size: 13.5px;
    max-width: 240px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tab-close {
    flex: none;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    opacity: 0.55;
  }
  .tab-close:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.12);
  }

  .unsaved {
    --rot: -5deg;
    flex: none;
    margin-left: 8px;
    padding: 2px 6px 1px;
    border: 1.5px solid var(--stamp);
    border-radius: 3px;
    color: var(--stamp);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transform: rotate(var(--rot));
    mask-image: var(--stamp-mask);
    animation: stamp-in 0.3s cubic-bezier(0.3, 1.4, 0.5, 1);
  }

  /* Tools: typewriter keys sitting in a recessed pen tray. */
  .tray {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 7px 7px;
    border-radius: 13px;
    background: var(--surface-3);
    box-shadow: var(--inset);
  }
  .key-wrap {
    position: relative;
  }
  .key {
    position: relative;
    display: grid;
    place-items: center;
    width: 40px;
    height: 38px;
    padding: 0;
    border: 1px solid var(--border-strong);
    border-bottom-width: 3px;
    border-radius: 8px;
    background: linear-gradient(var(--surface), var(--surface-2));
    color: var(--text-2);
    transition: transform 0.07s, color 0.12s, border-color 0.12s;
  }
  .key:hover {
    color: var(--text);
    transform: translateY(-1px);
  }
  .key:active,
  .key.active {
    transform: translateY(2px);
    border-bottom-width: 1px;
  }
  .key.active {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border-strong));
    color: var(--accent-text);
  }
  .cap {
    position: absolute;
    top: 1px;
    left: 4px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-3);
  }
  .key.active .cap {
    color: var(--accent-text);
    opacity: 0.7;
  }
  .groove {
    width: 2px;
    height: 24px;
    margin: 0 3px;
    border-radius: 1px;
    background: var(--border-strong);
    box-shadow: 1px 0 0 var(--surface);
  }

  /* Save: a rubber stamp. */
  .stamp {
    position: relative;
    display: flex;
    align-items: stretch;
    height: 38px;
    margin-left: 10px;
    border: 2px solid var(--stamp);
    border-radius: 5px;
    background: var(--surface);
    box-shadow: inset 0 0 0 2px var(--surface), inset 0 0 0 3px color-mix(in srgb, var(--stamp) 55%, transparent);
    color: var(--stamp);
    transform: rotate(-1.5deg);
    transition: transform 0.15s;
  }
  .stamp:hover {
    transform: rotate(0deg);
  }
  .stamp-main,
  .stamp-more {
    display: flex;
    align-items: center;
    gap: 7px;
    border: none;
    background: transparent;
    color: inherit;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    mask-image: var(--stamp-mask);
    transition: background 0.12s, transform 0.08s;
  }
  .stamp-main {
    padding: 0 12px 0 13px;
    border-radius: 3px 0 0 3px;
  }
  .stamp-more {
    padding: 0 9px;
    border-left: 1.5px dashed color-mix(in srgb, var(--stamp) 60%, transparent);
    border-radius: 0 3px 3px 0;
  }
  .stamp-main:hover:not(:disabled),
  .stamp-more:hover:not(:disabled) {
    background: var(--stamp-soft);
  }
  .stamp-main:active:not(:disabled) {
    transform: scale(0.94);
  }
  .stamp button:disabled {
    cursor: progress;
  }
  .save-menu {
    top: calc(100% + 8px);
    right: -2px;
    width: 320px;
    color: var(--text);
  }
  .menu-head {
    padding: 6px 10px 4px;
  }

  @media (max-width: 1360px) {
    .wordmark {
      display: none;
    }
  }
  @media (max-width: 1080px) {
    .file-tab,
    .unsaved,
    .vrule {
      display: none;
    }
  }
  /* Compact: smaller keys and an icon-only stamp so everything fits down to the 760px minimum. */
  @media (max-width: 980px) {
    .toolbar {
      gap: 8px;
      padding: 0 10px;
    }
    .tray {
      gap: 3px;
      padding: 5px;
    }
    .key {
      width: 32px;
      height: 34px;
    }
    .cap {
      display: none;
    }
    .groove {
      margin: 0 2px;
    }
    .stamp-label {
      display: none;
    }
    .stamp {
      margin-left: 4px;
    }
    .stamp-main {
      padding: 0 10px;
    }
  }
</style>
