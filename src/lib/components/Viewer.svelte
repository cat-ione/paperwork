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
    editor.tool === "select" ? "default" : editor.tool === "whiteout" || editor.tool === "highlight" || editor.tool === "circle" ? "crosshair" : "copy",
  );

  const hint = $derived.by(() => {
    switch (editor.tool) {
      case "text":
        return "Click to add text";
      case "date":
        return "Click to add today's date";
      case "check":
        return "Click to add a check";
      case "cross":
        return "Click to add a cross";
      case "signature":
        return "Click to place signature";
      case "initials":
        return "Click to place initials";
      case "circle":
        return "Drag to circle · Shift for a perfect circle";
      case "whiteout":
        return "Drag to cover";
      case "highlight":
        return "Drag to highlight";
      default:
        return "";
    }
  });
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
    <div class="hint" role="status">{hint} <span class="kbd">Esc</span></div>
  {/if}

  <div class="zoombar">
    <button class="icon-btn" aria-label="Previous page" disabled={editor.currentPage === 0} onclick={() => editor.goToPage(editor.currentPage - 1)}>
      <ChevronLeft size={16} />
    </button>
    <div class="page-ind">
      {#if editingPage}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="page-input"
          bind:value={pageInput}
          autofocus
          aria-label="Go to page"
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
          title="Go to page…"
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
      <ChevronRight size={16} />
    </button>
    <span class="divider"></span>
    <button class="icon-btn" aria-label="Zoom out" onclick={() => editor.zoomOut()}><Minus size={15} /></button>
    <button class="zoom-val" onclick={() => editor.setZoom(1)} title="Actual size">{Math.round(editor.zoom * 100)}%</button>
    <button class="icon-btn" aria-label="Zoom in" onclick={() => editor.zoomIn()}><Plus size={15} /></button>
    <span class="divider"></span>
    <button class="icon-btn" data-tip="Fit width Ctrl+0" aria-label="Fit width" onclick={() => editor.fitWidth()}><MoveHorizontal size={15} /></button>
    <button class="icon-btn" data-tip="Fit page" aria-label="Fit page" onclick={() => editor.fitPage()}><Scan size={15} /></button>
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
    background: var(--desk);
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
    bottom: 16px;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 4px;
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-md);
    z-index: 10;
  }
  .zoombar .icon-btn {
    width: 28px;
    height: 28px;
  }
  .divider {
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: var(--border-strong);
  }
  .page-ind {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 2px;
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .page-btn,
  .page-input {
    width: 36px;
    height: 24px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 4px;
    background: var(--surface-3);
    text-align: center;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
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
    min-width: 48px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .zoom-val:hover {
    background: var(--surface-3);
  }

  .hint {
    position: absolute;
    top: 12px;
    left: 50%;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 6px 5px 12px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-md);
    font-size: 13px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
    animation: pop-in 0.1s ease-out;
  }
</style>
