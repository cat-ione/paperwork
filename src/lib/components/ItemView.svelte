<script lang="ts">
  import { tick } from "svelte";
  import { GripVertical } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { LINE_HEIGHT, SYMBOL_PATHS, SYMBOL_STROKE, TEXT_PAD } from "../pdf";
  import type { Item } from "../types";
  import ItemToolbar from "./ItemToolbar.svelte";

  let { item }: { item: Item } = $props();

  let root: HTMLDivElement;
  let textarea = $state<HTMLTextAreaElement>();
  let editing = $state(false);

  const z = $derived(editor.zoom);
  const selected = $derived(editor.selectedId === item.id);
  const page = $derived(editor.pages[item.page]);

  const FONTS = { helvetica: "Arimo, Helvetica, Arial, sans-serif", times: "Tinos, 'Times New Roman', serif", courier: "Cousine, 'Courier New', monospace" };

  // Focus newly created text boxes.
  $effect(() => {
    if (item.type === "text" && editor.focusItemId === item.id && textarea) {
      editor.focusItemId = null;
      tick().then(() => textarea?.focus());
    }
  });

  type Handle = "move" | "nw" | "ne" | "sw" | "se";

  function startDrag(e: PointerEvent, handle: Handle) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (handle === "move" && editing) return; // let the textarea handle selection
    e.preventDefault();
    editor.selectedId = item.id;

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const start = { cx: e.clientX, cy: e.clientY, x: item.x, y: item.y, w: item.w, h: item.h };
    const keepRatio = item.type !== "rect";
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.cx) / z;
      const dy = (ev.clientY - start.cy) / z;
      if (!moved && Math.hypot(dx * z, dy * z) < 3) return;
      moved = true;
      const pw = page?.width ?? Infinity;
      const ph = page?.height ?? Infinity;

      if (handle === "move") {
        const w = item.type === "text" ? root.offsetWidth / z : item.w;
        const h = item.type === "text" ? root.offsetHeight / z : item.h;
        editor.update(
          item.id,
          { x: clamp(start.x + dx, 0, pw - w), y: clamp(start.y + dy, 0, ph - h) },
          false,
        );
        return;
      }

      const west = handle.includes("w");
      const north = handle.includes("n");
      let w = Math.max(6, start.w + (west ? -dx : dx));
      let h = Math.max(6, start.h + (north ? -dy : dy));
      if (keepRatio) {
        const ratio = start.h / start.w;
        if (Math.abs(dx) * ratio > Math.abs(dy)) h = w * ratio;
        else w = h / ratio;
      }
      const x = west ? start.x + start.w - w : start.x;
      const y = north ? start.y + start.h - h : start.y;
      if (x < 0 || y < 0 || x + w > pw || y + h > ph) return;
      editor.update(item.id, { x, y, w, h }, false);
      if (item.type === "symbol") editor.symbolSize = w;
    };

    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      if (moved) editor.checkpoint();
      else if (item.type === "text" && handle === "move") beginEdit();
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  }

  function beginEdit() {
    if (!textarea) return;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }

  function onBlur() {
    editing = false;
    if (item.type === "text" && !item.text.trim()) editor.remove(item.id);
    else editor.checkpoint();
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(v, Math.max(min, max)));
  }
</script>

<div
  bind:this={root}
  class="item {item.type}"
  class:selected
  class:editing
  style:left="{item.x * z}px"
  style:top="{item.y * z}px"
  style:width={item.type === "text" ? undefined : `${item.w * z}px`}
  style:height={item.type === "text" ? undefined : `${item.h * z}px`}
  onpointerdown={(e) => startDrag(e, "move")}
  role="group"
>
  {#if item.type === "text"}
    <textarea
      bind:this={textarea}
      class="text-input"
      style:font-family={FONTS[item.font]}
      style:font-size="{item.fontSize * z}px"
      style:line-height={LINE_HEIGHT}
      style:padding="{TEXT_PAD * z}px"
      style:color={item.color}
      value={item.text}
      placeholder="Type here"
      rows="1"
      spellcheck="false"
      onfocus={() => {
        editing = true;
        editor.selectedId = item.id;
      }}
      onblur={onBlur}
      oninput={(e) => editor.update(item.id, { text: e.currentTarget.value }, false)}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.currentTarget.blur();
        }
      }}
    ></textarea>
    {#if selected && !editing}
      <div class="grip" style:height="{Math.max(18, item.fontSize * LINE_HEIGHT * z)}px"><GripVertical size={12} /></div>
    {/if}
  {:else if item.type === "image"}
    <img src={item.src} alt={item.kind} draggable="false" />
  {:else if item.type === "symbol"}
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <path
        d={SYMBOL_PATHS[item.symbol]}
        fill="none"
        stroke={item.color}
        stroke-width={SYMBOL_STROKE}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {:else if item.type === "rect"}
    <div class="fill {item.kind}" style:background={item.color}></div>
  {/if}

  {#if selected && item.type !== "text"}
    {#each ["nw", "ne", "sw", "se"] as const as h (h)}
      <div class="handle {h}" onpointerdown={(e) => startDrag(e, h)} role="presentation"></div>
    {/each}
  {/if}

  {#if selected}
    <ItemToolbar {item} below={item.y * z < 52} />
  {/if}
</div>

<style>
  .item {
    position: absolute;
    cursor: move;
    touch-action: none;
  }
  .item::after {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 3px;
    pointer-events: none;
    transition: box-shadow 0.1s;
  }
  .item:hover::after {
    box-shadow: 0 0 0 1px rgba(91, 91, 214, 0.5);
  }
  .item.selected::after {
    box-shadow: 0 0 0 1.5px #5b5bd6;
  }
  .item.editing::after {
    box-shadow: 0 0 0 1.5px #5b5bd6, 0 0 0 4px rgba(91, 91, 214, 0.2);
  }
  .item.selected {
    z-index: 3;
  }

  .text-input {
    display: block;
    margin: 0;
    border: none;
    background: transparent;
    outline: none;
    resize: none;
    overflow: hidden;
    white-space: pre;
    field-sizing: content;
    min-width: 2ch;
    cursor: inherit;
  }
  .editing .text-input {
    cursor: text;
  }
  .text-input::placeholder {
    color: rgba(17, 17, 17, 0.35);
  }
  .grip {
    position: absolute;
    top: 0;
    right: 100%;
    margin-right: 4px;
    display: grid;
    place-items: center;
    width: 14px;
    border-radius: 4px;
    background: #5b5bd6;
    color: #fff;
  }

  img,
  svg {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }
  .fill {
    width: 100%;
    height: 100%;
  }
  .fill.whiteout {
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
  }
  .fill.highlight {
    opacity: 0.45;
    mix-blend-mode: multiply;
  }

  .handle {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: #fff;
    border: 1.5px solid #5b5bd6;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }
  .nw {
    left: -7px;
    top: -7px;
    cursor: nwse-resize;
  }
  .ne {
    right: -7px;
    top: -7px;
    cursor: nesw-resize;
  }
  .sw {
    left: -7px;
    bottom: -7px;
    cursor: nesw-resize;
  }
  .se {
    right: -7px;
    bottom: -7px;
    cursor: nwse-resize;
  }
</style>
