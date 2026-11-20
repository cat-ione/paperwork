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
    XCircle,
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
    { id: "cross", label: "Cross", key: "", icon: X },
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
    <div class="brand"><Logo size={26} /></div>
    <button class="icon-btn" data-tip="Open… (Ctrl+O)" onclick={onOpen}><FolderOpen size={18} /></button>
    <div class="file" title={editor.filePath ?? editor.fileName}>
      <span class="name">{editor.fileName}</span>
      {#if editor.dirty}<span class="dirty" title="Unsaved changes"></span>{/if}
    </div>
    <button class="icon-btn close" data-tip="Close (Ctrl+W)" onclick={onClose}><XCircle size={16} /></button>
  </div>

  <div class="tools" role="toolbar" aria-label="Tools">
    {#each tools as t, i (t.id)}
      {#if i === 1 || i === 5 || i === 7}<span class="sep"></span>{/if}
      <div class="tool-wrap">
        <button
          class="tool"
          class:active={isActive(t.id)}
          aria-pressed={isActive(t.id)}
          data-tip={t.key ? `${t.label} (${t.key})` : t.label}
          onclick={() => pick(t.id)}
          onpointerdown={(e) => e.stopPropagation()}
        >
          <t.icon size={18} strokeWidth={t.id === "check" || t.id === "cross" ? 2.6 : 2} />
          {#if t.id === "text" || t.id === "signature" || t.id === "date"}
            <span class="tool-label">{t.label}</span>
          {/if}
        </button>
        {#if (t.id === "signature" || t.id === "initials") && editor.signaturePicker === t.id}
          <SignaturePicker kind={t.id} />
        {/if}
      </div>
    {/each}
  </div>

  <div class="right">
    <button class="icon-btn" data-tip="Undo (Ctrl+Z)" disabled={!editor.canUndo} onclick={() => editor.undo()}>
      <Undo2 size={18} />
    </button>
    <button class="icon-btn" data-tip="Redo (Ctrl+Y)" disabled={!editor.canRedo} onclick={() => editor.redo()}>
      <Redo2 size={18} />
    </button>
    <span class="sep"></span>
    <button class="icon-btn" data-tip="Theme: {prefs.theme}" onclick={cycleTheme}>
      {#if prefs.theme === "light"}<Sun size={18} />{:else if prefs.theme === "dark"}<Moon size={18} />{:else}<Monitor size={18} />{/if}
    </button>
    <button
      class="icon-btn"
      class:active={editor.showThumbnails}
      data-tip="Pages panel"
      onclick={() => (editor.showThumbnails = !editor.showThumbnails)}
    >
      <PanelLeft size={18} />
    </button>
    <button
      class="icon-btn"
      class:active={editor.showFieldsPanel}
      data-tip="Form panel"
      onclick={() => (editor.showFieldsPanel = !editor.showFieldsPanel)}
    >
      <PanelRight size={18} />
    </button>

    <div class="save" onpointerdown={(e) => e.stopPropagation()} role="group">
      <button class="btn primary save-main" disabled={editor.saving} onclick={() => save("save")}>
        {#if editor.saving}
          <LoaderCircle size={16} class="spin" />
        {:else if inTauri}
          <Save size={16} />
        {:else}
          <Download size={16} />
        {/if}
        {inTauri ? "Save" : "Download"}
      </button>
      <button
        class="btn primary save-more"
        aria-label="More save options"
        disabled={editor.saving}
        onclick={() => (saveMenu = !saveMenu)}
      >
        <ChevronDown size={16} />
      </button>
      {#if saveMenu}
        <div class="popover save-menu">
          <button class="menu-item" onclick={() => save("save")}>
            <Save size={16} />
            <span>Save<span class="sub">Keep form fields editable</span></span>
            <span class="hint">Ctrl+S</span>
          </button>
          {#if inTauri}
            <button class="menu-item" onclick={() => save("saveAs")}>
              <FilePlus2 size={16} />
              <span>Save as…<span class="sub">Save a copy under a new name</span></span>
              <span class="hint">Ctrl+Shift+S</span>
            </button>
          {/if}
          <button class="menu-item" onclick={() => save("flatten")}>
            <FileLock2 size={16} />
            <span>Save flattened copy…<span class="sub">Lock everything in place — ready to send</span></span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
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
    display: grid;
    place-items: center;
    margin-right: 6px;
  }
  .file {
    display: flex;
    align-items: center;
    gap: 8px;
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
    opacity: 0;
    transition: opacity 0.12s;
  }
  .left:hover .close,
  .close:focus-visible {
    opacity: 1;
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .tool-wrap {
    position: relative;
  }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    min-width: 36px;
    padding: 0 9px;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-2);
    font-weight: 500;
    transition: background 0.12s, color 0.12s, box-shadow 0.12s;
  }
  .tool:hover {
    background: var(--surface-3);
    color: var(--text);
  }
  .tool.active {
    background: var(--surface);
    color: var(--accent-text);
    box-shadow: var(--shadow-sm), 0 0 0 1px var(--border);
  }
  .sep {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: var(--border);
  }

  .save {
    position: relative;
    display: flex;
    margin-left: 8px;
  }
  .save-main {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    padding-right: 12px;
  }
  .save-more {
    width: 30px;
    padding: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.22);
  }
  .save-menu {
    top: calc(100% + 6px);
    right: 0;
    width: 330px;
  }

  :global(.spin) {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1180px) {
    .tool-label {
      display: none;
    }
  }
  @media (max-width: 940px) {
    .file {
      display: none;
    }
  }
</style>
