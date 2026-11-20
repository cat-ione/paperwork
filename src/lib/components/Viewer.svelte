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

  const pad = (n: number) => String(n).padStart(2, "0");

  const cursor = $derived(
    editor.tool === "select" ? "default" : editor.tool === "whiteout" || editor.tool === "highlight" ? "crosshair" : "copy",
  );

  const hint = $derived.by(() => {
    switch (editor.tool) {
      case "text":
        return "Click where you want to write";
      case "date":
        return "Click to stamp today's date";
      case "check":
      case "cross":
        return "Click a box to mark it";
      case "signature":
        return "Click where you'd like to sign";
      case "initials":
        return "Click to add your initials";
      case "whiteout":
        return "Drag over anything to cover it up";
      case "highlight":
        return "Drag across the text to highlight";
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
    {#key editor.tool}
      <div class="sticky-note" role="status">
        <span class="note-text">{hint}</span>
        <span class="note-esc"><span class="kbd">Esc</span> to put it back</span>
      </div>
    {/key}
  {/if}

  <div class="zoombar">
    <span class="mono-label folio">Folio</span>
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
          {pad(editor.currentPage + 1)}
        </button>
      {/if}
      <span class="of">of {pad(editor.pages.length)}</span>
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
    background:
      radial-gradient(ellipse at 50% 0%, transparent 60%, rgba(60, 40, 10, 0.08) 100%),
      var(--grain),
      var(--desk);
    background-attachment: local, local, local;
  }
  .pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    padding: 32px 40px 110px;
    width: max-content;
    min-width: 100%;
  }

  /* Status strip: a strip of ruler along the bottom edge. */
  .zoombar {
    position: absolute;
    left: 50%;
    bottom: 18px;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 9px 6px 5px 12px;
    border-radius: 4px;
    background:
      repeating-linear-gradient(90deg, var(--border-strong) 0 1px, transparent 1px 8px) top left / 100% 4px no-repeat,
      repeating-linear-gradient(90deg, var(--text-3) 0 1px, transparent 1px 40px) top left / 100% 7px no-repeat,
      var(--surface);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-md);
    z-index: 10;
  }
  .zoombar .icon-btn {
    width: 28px;
    height: 28px;
  }
  .folio {
    margin-right: 2px;
  }
  .divider {
    width: 1px;
    height: 18px;
    margin: 0 6px;
    background: var(--border-strong);
  }
  .page-ind {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 0 2px;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  .page-btn,
  .page-input {
    width: 34px;
    height: 26px;
    padding: 0;
    border: none;
    border-bottom: 1.5px solid var(--text-3);
    border-radius: 0;
    background: transparent;
    text-align: center;
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
  .page-btn:hover {
    border-bottom-color: var(--accent);
    color: var(--accent-text);
  }
  .page-input {
    border-bottom-color: var(--accent);
    outline: none;
  }
  .of {
    color: var(--text-3);
    font-size: 11.5px;
    white-space: nowrap;
  }
  .zoom-val {
    min-width: 50px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .zoom-val:hover {
    background: var(--surface-3);
  }

  /* Tool hint: a sticky note slapped onto the desk. */
  .sticky-note {
    position: absolute;
    right: 28px;
    bottom: 26px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 230px;
    padding: 16px 18px 12px;
    background: linear-gradient(170deg, color-mix(in srgb, var(--note) 85%, white), var(--note));
    color: #3a3110;
    box-shadow: 0 1px 1px rgba(60, 45, 10, 0.15), 0 12px 18px -10px rgba(60, 45, 10, 0.5);
    transform: rotate(-2deg);
    pointer-events: none;
    z-index: 10;
    animation: note-in 0.25s cubic-bezier(0.3, 1.3, 0.5, 1);
  }
  .sticky-note::before {
    content: "";
    position: absolute;
    top: -9px;
    left: 50%;
    width: 70px;
    height: 20px;
    translate: -50% 0;
    rotate: -3deg;
    background: rgba(255, 255, 255, 0.45);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
  }
  .note-text {
    font-family: var(--font-hand);
    font-size: 23px;
    font-weight: 500;
    line-height: 1.05;
  }
  .note-esc {
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    opacity: 0.7;
  }
  .note-esc .kbd {
    background: rgba(255, 255, 255, 0.5);
    border-color: rgba(58, 49, 16, 0.3);
    color: inherit;
  }
  @keyframes note-in {
    from {
      opacity: 0;
      transform: translateY(-10px) rotate(-3deg) scale(0.96);
    }
  }
</style>
