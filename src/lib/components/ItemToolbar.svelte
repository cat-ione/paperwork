<script lang="ts">
  import { Copy, Minus, Plus, Trash2 } from "@lucide/svelte";
  import { editor, INK_COLORS } from "../editor.svelte";
  import type { FontFamily, Item } from "../types";

  let { item, below }: { item: Item; below: boolean } = $props();

  const HIGHLIGHTS = ["#fde047", "#86efac", "#f9a8d4", "#93c5fd"];
  const FONT_OPTIONS: { id: FontFamily; label: string; css: string }[] = [
    { id: "helvetica", label: "Sans", css: "Arimo, sans-serif" },
    { id: "times", label: "Serif", css: "Tinos, serif" },
    { id: "courier", label: "Mono", css: "Cousine, monospace" },
  ];

  function setSize(delta: number) {
    if (item.type !== "text") return;
    const size = Math.min(72, Math.max(6, item.fontSize + delta));
    editor.styleText({ fontSize: size });
  }

  // Keep focus in the text box while using the toolbar.
  function keepFocus(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<div class="bar" class:below onpointerdown={keepFocus} role="toolbar" tabindex="-1" aria-label="Item options">
  {#if item.type === "text"}
    <div class="seg">
      {#each FONT_OPTIONS as f (f.id)}
        <button class:on={item.font === f.id} style:font-family={f.css} onclick={() => editor.styleText({ font: f.id })}>
          {f.label}
        </button>
      {/each}
    </div>
    <span class="sep"></span>
    <button class="ib" aria-label="Smaller text" onclick={() => setSize(-1)}><Minus size={14} /></button>
    <span class="size">{item.fontSize}</span>
    <button class="ib" aria-label="Larger text" onclick={() => setSize(1)}><Plus size={14} /></button>
    <span class="sep"></span>
  {/if}

  {#if item.type === "text" || item.type === "symbol"}
    {#each INK_COLORS as c (c)}
      <button
        class="swatch"
        class:on={item.color === c}
        style:--c={c}
        aria-label="Color {c}"
        onclick={() => editor.styleText({ color: c })}
      ></button>
    {/each}
    <span class="sep"></span>
  {:else if item.type === "rect" && item.kind === "highlight"}
    {#each HIGHLIGHTS as c (c)}
      <button
        class="swatch"
        class:on={item.color === c}
        style:--c={c}
        aria-label="Highlight color {c}"
        onclick={() => editor.update(item.id, { color: c })}
      ></button>
    {/each}
    <span class="sep"></span>
  {/if}

  <button class="ib" aria-label="Duplicate (Ctrl+D)" title="Duplicate (Ctrl+D)" onclick={() => editor.duplicate(item.id)}>
    <Copy size={14} />
  </button>
  <button class="ib danger" aria-label="Delete (Del)" title="Delete (Del)" onclick={() => editor.remove(item.id)}>
    <Trash2 size={14} />
  </button>
</div>

<style>
  .bar {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 10px);
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: #1c1d22;
    color: #e8e9ec;
    box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06);
    white-space: nowrap;
    cursor: default;
    z-index: 10;
    animation: pop-in 0.12s ease-out;
    font-family: var(--font-ui);
    font-size: 12.5px;
  }
  .bar.below {
    bottom: auto;
    top: calc(100% + 10px);
  }
  button {
    border: none;
    background: transparent;
    color: inherit;
  }
  .ib {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
  }
  .ib:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .ib.danger:hover {
    background: rgba(248, 113, 113, 0.18);
    color: #fca5a5;
  }
  .seg {
    display: flex;
    padding: 2px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.06);
  }
  .seg button {
    height: 24px;
    padding: 0 8px;
    border-radius: 5px;
    color: #a9acb6;
    font-size: 13px;
  }
  .seg button:hover {
    color: #fff;
  }
  .seg button.on {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }
  .size {
    min-width: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .swatch {
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .swatch::before {
    content: "";
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  .swatch.on::before {
    box-shadow: 0 0 0 2px #1c1d22, 0 0 0 3.5px #fff;
  }
  .sep {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: rgba(255, 255, 255, 0.12);
  }
</style>
