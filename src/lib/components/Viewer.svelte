<script lang="ts">
  import { onMount, setContext } from "svelte";
  import { ChevronLeft, ChevronRight, Minus, Plus, Scan, MoveHorizontal } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import PageView from "./PageView.svelte";

  let scroller: HTMLDivElement;
  let pageInput = $state("");
  let editingPage = $state(false);

  // Pages observe visibility relative to this scroller.
  const observers = new Map<Element, (visible: boolean) => void>();
  let io: IntersectionObserver | undefined;
  setContext("observe", (el: Element, cb: (visible: boolean) => void) => {
    observers.set(el, cb);
    io?.observe(el);
    return () => {
      observers.delete(el);
      io?.unobserve(el);
    };
  });

  onMount(() => {
    editor.scroller = scroller;
    io = new IntersectionObserver(
      (entries) => entries.forEach((e) => observers.get(e.target)?.(e.isIntersecting)),
      { root: scroller, rootMargin: "1200px 0px" },
    );
    observers.forEach((_, el) => io!.observe(el));

    // Initial zoom: fit width, but don't blow small screens up too far.
    const widest = Math.max(...editor.pages.map((p) => p.width), 1);
    editor.zoom = Math.min(1.5, Math.max(0.5, (scroller.clientWidth - 64) / widest));

    return () => {
      io?.disconnect();
      editor.scroller = null;
    };
  });

  function onScroll() {
    const mid = scroller.scrollTop + scroller.clientHeight * 0.4;
    let current = 0;
    for (let i = 0; i < editor.pageEls.length; i++) {
      const el = editor.pageEls[i];
      if (el && el.offsetTop <= mid) current = i;
      else break;
    }
    editor.currentPage = current;
  }

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = scroller.getBoundingClientRect();
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
    editor.setZoom(editor.zoom * factor, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function commitPage() {
    editingPage = false;
    const n = parseInt(pageInput, 10);
    if (n >= 1 && n <= editor.pages.length) editor.goToPage(n - 1);
  }

  const cursor = $derived(
    editor.tool === "select" ? "default" : editor.tool === "whiteout" || editor.tool === "highlight" ? "crosshair" : "copy",
  );
</script>

<main class="viewer">
  <div
    class="scroller"
    bind:this={scroller}
    onscroll={onScroll}
    onwheel={onWheel}
    style:cursor
    role="presentation"
    onpointerdown={(e) => {
      if (e.target === e.currentTarget) editor.selectedId = null;
    }}
  >
    <div class="pages">
      {#each editor.pages as page (page.index)}
        <PageView {page} />
      {/each}
    </div>
  </div>

  {#if editor.tool !== "select"}
    <div class="hint-pill">
      {#if editor.tool === "whiteout" || editor.tool === "highlight"}
        Drag on the page to draw a {editor.tool === "whiteout" ? "whiteout box" : "highlight"}
      {:else if editor.tool === "text"}
        Click where you want to type
      {:else}
        Click on the page to place it
      {/if}
      <span class="kbd">Esc</span> to cancel
    </div>
  {/if}

  <div class="zoombar">
    <button class="icon-btn" aria-label="Previous page" disabled={editor.currentPage === 0} onclick={() => editor.goToPage(editor.currentPage - 1)}>
      <ChevronLeft size={17} />
    </button>
    <div class="page-ind">
      {#if editingPage}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="page-input"
          bind:value={pageInput}
          autofocus
          onblur={commitPage}
          onkeydown={(e) => {
            if (e.key === "Enter") commitPage();
            if (e.key === "Escape") editingPage = false;
            e.stopPropagation();
          }}
        />
      {:else}
        <button
          class="page-btn"
          onclick={() => {
            pageInput = String(editor.currentPage + 1);
            editingPage = true;
          }}
        >
          {editor.currentPage + 1}
        </button>
      {/if}
      <span class="of">/ {editor.pages.length}</span>
    </div>
    <button
      class="icon-btn"
      aria-label="Next page"
      disabled={editor.currentPage >= editor.pages.length - 1}
      onclick={() => editor.goToPage(editor.currentPage + 1)}
    >
      <ChevronRight size={17} />
    </button>
    <span class="divider"></span>
    <button class="icon-btn" aria-label="Zoom out" onclick={() => editor.zoomOut()}><Minus size={16} /></button>
    <button class="zoom-val" onclick={() => editor.setZoom(1)} title="Reset to 100%">{Math.round(editor.zoom * 100)}%</button>
    <button class="icon-btn" aria-label="Zoom in" onclick={() => editor.zoomIn()}><Plus size={16} /></button>
    <span class="divider"></span>
    <button class="icon-btn" data-tip="Fit width (Ctrl+0)" onclick={() => editor.fitWidth()}><MoveHorizontal size={16} /></button>
    <button class="icon-btn" data-tip="Fit page" onclick={() => editor.fitPage()}><Scan size={16} /></button>
  </div>
</main>

<style>
  .viewer {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
  }
  .scroller {
    flex: 1;
    overflow: auto;
    background: var(--bg);
  }
  .pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 24px 32px 96px;
    width: max-content;
    min-width: 100%;
  }

  .zoombar {
    position: absolute;
    left: 50%;
    bottom: 18px;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-md);
    z-index: 10;
  }
  .zoombar .icon-btn {
    width: 30px;
    height: 30px;
  }
  .divider {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: var(--border);
  }
  .page-ind {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    font-variant-numeric: tabular-nums;
  }
  .page-btn,
  .page-input {
    width: 38px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: var(--surface-3);
    text-align: center;
    font-weight: 600;
    padding: 0;
  }
  .page-input {
    border-color: var(--accent);
    background: var(--surface);
    outline: none;
  }
  .of {
    color: var(--text-3);
    white-space: nowrap;
  }
  .zoom-val {
    min-width: 52px;
    height: 30px;
    border: none;
    border-radius: 6px;
    background: transparent;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .zoom-val:hover {
    background: var(--surface-3);
  }

  .hint-pill {
    position: absolute;
    top: 14px;
    left: 50%;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 99px;
    background: var(--text);
    color: var(--surface);
    font-size: 13px;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    pointer-events: none;
    animation: pop-in 0.15s ease-out;
    z-index: 10;
    white-space: nowrap;
  }
  .hint-pill .kbd {
    background: transparent;
    color: inherit;
    border-color: color-mix(in srgb, var(--surface) 40%, transparent);
    opacity: 0.8;
  }
</style>
