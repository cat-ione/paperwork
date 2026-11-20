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
    MousePointer2,
    PanelLeft,
    PanelRight,
    PenLine,
    Redo2,
    Save,
    SquarePen,
    Type,
    Undo2,
    X,
  } from "@lucide/svelte";
  import type { Component } from "svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import type { Tool } from "../types";
  import SignaturePicker from "./SignaturePicker.svelte";
  import ThemePicker from "./ThemePicker.svelte";
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

  function save(mode: Parameters<typeof editor.save>[0]) {
    saveMenu = false;
    editor.save(mode);
  }
</script>

<svelte:window onpointerdown={() => (saveMenu = false)} />

<header class="toolbar">
  <div class="left">
    <span class="logo"><Logo size={24} /></span>
    <button class="icon-btn" data-tip="Open Ctrl+O" aria-label="Open a PDF" onclick={onOpen}><FolderOpen size={18} /></button>
    <div class="file" title={editor.filePath ?? editor.fileName}>
      <span class="name">{editor.fileName}</span>
      {#if editor.dirty}<span class="dirty" title="Unsaved changes"></span>{/if}
    </div>
    <button class="icon-btn close" aria-label="Close document" data-tip="Close Ctrl+W" onclick={onClose}><X size={15} /></button>
  </div>

  <div class="tools" role="toolbar" aria-label="Tools">
    {#each tools as t, i (t.id)}
      {#if i === 1 || i === 5 || i === 7}<span class="sep"></span>{/if}
      <div class="tool-wrap">
        <button
          class="tool"
          class:active={isActive(t.id)}
          aria-pressed={isActive(t.id)}
          aria-label={t.label}
          data-tip={t.label}
          onclick={() => pick(t.id)}
          onpointerdown={(e) => e.stopPropagation()}
        >
          <t.icon size={17} strokeWidth={t.id === "check" || t.id === "cross" ? 2.5 : 2} />
          <span class="key">{t.key}</span>
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
    <span class="sep"></span>
    <ThemePicker />
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
      data-tip="Fields"
      aria-label="Toggle fields panel"
      onclick={() => (editor.showFieldsPanel = !editor.showFieldsPanel)}
    >
      <PanelRight size={18} />
    </button>

    <div class="save" onpointerdown={(e) => e.stopPropagation()} role="group" aria-label="Save">
      <button class="btn primary save-main" disabled={editor.saving} onclick={() => save("save")}>
        {#if editor.saving}
          <LoaderCircle size={15} class="spin" />
        {:else if inTauri}
          <Save size={15} />
        {:else}
          <Download size={15} />
        {/if}
        <span class="save-label">{inTauri ? "Save" : "Download"}</span>
      </button>
      <button class="btn primary save-more" aria-label="More save options" disabled={editor.saving} onclick={() => (saveMenu = !saveMenu)}>
        <ChevronDown size={15} />
      </button>
      {#if saveMenu}
        <div class="popover save-menu">
          <button class="menu-item" onclick={() => save("save")}>
            <Save size={16} />
            <span>{inTauri ? "Save" : "Download"}<span class="sub">Fields stay editable</span></span>
            <span class="hint">Ctrl+S</span>
          </button>
          {#if inTauri}
            <button class="menu-item" onclick={() => save("saveAs")}>
              <FilePlus2 size={16} />
              <span>Save as…</span>
              <span class="hint">Ctrl+Shift+S</span>
            </button>
          {/if}
          <button class="menu-item" onclick={() => save("flatten")}>
            <FileLock2 size={16} />
            <span>Flattened copy<span class="sub">Fields become part of the page</span></span>
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
    gap: 12px;
    height: 52px;
    padding: 0 10px 0 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: relative;
    z-index: 20;
  }
  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
  .logo {
    display: grid;
    flex: none;
    margin-right: 8px;
  }
  .right {
    justify-content: flex-end;
  }
  .file {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding: 0 4px 0 6px;
    font-weight: 600;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dirty {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--warning);
  }
  .close {
    flex: none;
    width: 26px;
    height: 26px;
    color: var(--text-3);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 9px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .tool-wrap {
    position: relative;
  }
  .tool {
    position: relative;
    display: grid;
    place-items: center;
    width: 38px;
    height: 34px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-2);
    transition: background 0.1s, color 0.1s;
  }
  .tool:hover {
    background: var(--surface-3);
    color: var(--text);
  }
  .tool.active {
    background: var(--accent);
    color: var(--on-accent);
  }
  .key {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-family: var(--font-mono);
    font-size: 8.5px;
    font-weight: 600;
    line-height: 1;
    opacity: 0.55;
  }
  .sep {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: var(--border-strong);
  }

  .save {
    position: relative;
    display: flex;
    margin-left: 6px;
  }
  .save-main {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .save-more {
    width: 28px;
    padding: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left-color: color-mix(in srgb, var(--on-accent) 25%, var(--accent));
  }
  .save-menu {
    top: calc(100% + 6px);
    right: 0;
    width: 280px;
  }

  @media (max-width: 1080px) {
    .file,
    .close {
      display: none;
    }
  }
  @media (max-width: 960px) {
    .toolbar {
      gap: 6px;
      padding: 0 8px;
    }
    .tool {
      width: 32px;
    }
    .key {
      display: none;
    }
    .save-label {
      display: none;
    }
  }
</style>
