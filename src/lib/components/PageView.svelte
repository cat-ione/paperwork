<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { editor } from "../editor.svelte";
  import { AnnotationMode, RenderingCancelledException, SYMBOL_PATHS, SYMBOL_STROKE } from "../pdf";
  import type { PageInfo } from "../types";
  import FieldInput from "./FieldInput.svelte";
  import ItemView from "./ItemView.svelte";

  let { page }: { page: PageInfo } = $props();

  const observe = getContext<(el: Element, cb: (v: boolean) => void) => () => void>("observe");

  let root: HTMLDivElement;
  let holder: HTMLDivElement;
  let visible = $state(false);
  let renderedZoom = 0;
  let renderTask: { cancel(): void } | null = null;

  const z = $derived(editor.zoom);
  const widgets = $derived(editor.widgets.filter((w) => w.page === page.index));
  const items = $derived(editor.items.filter((i) => i.page === page.index));

  onMount(() => {
    editor.pageEls[page.index] = root;
    const stop = observe(root, (v) => (visible = v));
    return () => {
      stop();
      renderTask?.cancel();
      if (editor.pageEls[page.index] === root) editor.pageEls[page.index] = null;
    };
  });

  // Render when visible; re-render (debounced) on zoom; free the bitmap when far off-screen.
  $effect(() => {
    const zoom = z;
    if (!visible) {
      renderTask?.cancel();
      if (renderedZoom) {
        holder.querySelector("canvas")?.remove();
        renderedZoom = 0;
      }
      return;
    }
    if (zoom === renderedZoom) return;
    const t = setTimeout(() => render(zoom), renderedZoom ? 140 : 0);
    return () => clearTimeout(t);
  });

  async function render(zoom: number) {
    const doc = editor.doc;
    if (!doc) return;
    renderTask?.cancel();
    const pdfPage = await doc.getPage(page.index + 1);
    // Cap the backing store so very high zoom levels don't exhaust memory.
    const dpr = window.devicePixelRatio || 1;
    const maxScale = Math.sqrt(24e6 / (page.width * page.height));
    const viewport = pdfPage.getViewport({ scale: Math.min(zoom * dpr, maxScale) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const task = pdfPage.render({ canvas, viewport, annotationMode: AnnotationMode.ENABLE_FORMS });
    renderTask = task;
    try {
      await task.promise;
      holder.replaceChildren(canvas);
      renderedZoom = zoom;
    } catch (e) {
      if (!(e instanceof RenderingCancelledException)) console.error(e);
    }
  }

  // ---- Tool interactions -------------------------------------------------

  let ghost = $state<{ x: number; y: number } | null>(null);
  let draft = $state<{ x0: number; y0: number; x: number; y: number; w: number; h: number } | null>(null);

  function toView(e: PointerEvent) {
    const r = root.getBoundingClientRect();
    return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
  }

  function onToolDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = toView(e);
    if (editor.tool === "whiteout" || editor.tool === "highlight") {
      draft = { x0: p.x, y0: p.y, x: p.x, y: p.y, w: 0, h: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    editor.placeAt(page.index, p.x, p.y);
    ghost = null;
  }

  function onToolMove(e: PointerEvent) {
    const p = toView(e);
    if (draft) {
      const x = Math.max(0, Math.min(p.x, page.width));
      const y = Math.max(0, Math.min(p.y, page.height));
      draft = { ...draft, x: Math.min(draft.x0, x), y: Math.min(draft.y0, y), w: Math.abs(x - draft.x0), h: Math.abs(y - draft.y0) };
    } else {
      ghost = p;
    }
  }

  function onToolUp() {
    if (!draft) return;
    const kind = editor.tool === "highlight" ? "highlight" : "whiteout";
    let { x, y, w, h } = draft;
    if (w < 4 || h < 4) {
      // A click rather than a drag: drop a sensible default box.
      w = kind === "highlight" ? 120 : 100;
      h = kind === "highlight" ? 16 : 20;
      x = draft.x0 - w / 2;
      y = draft.y0 - h / 2;
    }
    draft = null;
    editor.add({
      id: Math.random().toString(36).slice(2, 10),
      type: "rect",
      kind,
      color: kind === "highlight" ? "#fde047" : "#ffffff",
      page: page.index,
      x,
      y,
      w,
      h,
    });
    editor.tool = "select";
  }

  const ghostSize = $derived.by(() => {
    if (editor.pending) return editor.signatureSize(editor.pending);
    const s = editor.symbolSize;
    return { w: s, h: s };
  });
</script>

<div
  class="page"
  bind:this={root}
  data-page={page.index}
  style:width="{page.width * z}px"
  style:height="{page.height * z}px"
  onpointerdown={(e) => {
    if (e.target === e.currentTarget || e.target === holder || (e.target as Element).tagName === "CANVAS") {
      editor.selectedId = null;
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }}
  role="presentation"
>
  <div class="canvas" bind:this={holder}></div>

  <div class="layer" class:highlight={editor.highlightFields}>
    {#each widgets as w (w.id)}
      <FieldInput widget={w} />
    {/each}
  </div>

  <div class="layer items">
    {#each items as item (item.id)}
      <ItemView {item} />
    {/each}
  </div>

  {#if editor.tool !== "select"}
    <div
      class="tool-layer"
      onpointerdown={onToolDown}
      onpointermove={onToolMove}
      onpointerup={onToolUp}
      onpointerleave={() => (ghost = null)}
      role="presentation"
    >
      {#if draft}
        <div
          class="draft"
          class:hl={editor.tool === "highlight"}
          style:left="{draft.x * z}px"
          style:top="{draft.y * z}px"
          style:width="{draft.w * z}px"
          style:height="{draft.h * z}px"
        ></div>
      {:else if ghost}
        {#if (editor.tool === "signature" || editor.tool === "initials") && editor.pending}
          <img
            class="ghost"
            src={editor.pending.src}
            alt=""
            style:left="{(ghost.x - ghostSize.w / 2) * z}px"
            style:top="{(ghost.y - ghostSize.h / 2) * z}px"
            style:width="{ghostSize.w * z}px"
            style:height="{ghostSize.h * z}px"
          />
        {:else if editor.tool === "check" || editor.tool === "cross"}
          <svg
            class="ghost"
            viewBox="0 0 24 24"
            style:left="{(ghost.x - ghostSize.w / 2) * z}px"
            style:top="{(ghost.y - ghostSize.h / 2) * z}px"
            style:width="{ghostSize.w * z}px"
            style:height="{ghostSize.h * z}px"
          >
            <path
              d={SYMBOL_PATHS[editor.tool]}
              fill="none"
              stroke={editor.textDefaults.color}
              stroke-width={SYMBOL_STROKE}
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else if editor.tool === "text" || editor.tool === "date"}
          <div
            class="ghost text-ghost"
            style:left="{ghost.x * z}px"
            style:top="{(ghost.y - (editor.textDefaults.fontSize * 1.2) / 2) * z}px"
            style:height="{editor.textDefaults.fontSize * 1.2 * z}px"
            style:font-size="{editor.textDefaults.fontSize * z}px"
          >
            {editor.tool === "date" ? new Date().toLocaleDateString() : ""}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    position: relative;
    flex: none;
    background: #fff;
    box-shadow: var(--shadow-page);
    border-radius: 1px;
  }
  .canvas,
  .layer,
  .tool-layer {
    position: absolute;
    inset: 0;
  }
  .canvas :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 2px;
  }
  .layer {
    pointer-events: none;
  }
  .layer > :global(*) {
    pointer-events: auto;
  }
  .tool-layer {
    z-index: 5;
  }
  .ghost {
    position: absolute;
    pointer-events: none;
    opacity: 0.55;
  }
  .text-ghost {
    display: flex;
    align-items: center;
    padding-left: 2px;
    border-left: 2px solid var(--accent);
    color: #111;
    font-family: Arimo, Arial, sans-serif;
    white-space: nowrap;
  }
  .draft {
    position: absolute;
    background: #fff;
    outline: 1.5px dashed var(--danger);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7);
  }
  .draft.hl {
    background: rgba(253, 224, 71, 0.45);
    mix-blend-mode: multiply;
  }
</style>
