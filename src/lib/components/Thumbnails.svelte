<script lang="ts">
  import { editor, isFilled } from "../editor.svelte";
  import Thumbnail from "./Thumbnail.svelte";

  let list: HTMLElement;

  /** Pages with required fields still empty get a red mark; other unfilled fields a blue one. */
  const pagesNeedingInput = $derived(new Set(editor.missingRequired.map((w) => w.page)));
  const pagesWithFields = $derived(
    new Set(editor.widgets.filter((w) => !w.readOnly && !isFilled(editor.values[w.name])).map((w) => w.page)),
  );

  // Keep the active thumbnail in view while scrolling the document.
  $effect(() => {
    const el = list?.querySelector(`[data-thumb="${editor.currentPage}"]`);
    el?.scrollIntoView({ block: "nearest" });
  });

  const pad = (n: number) => String(n).padStart(2, "0");
</script>

<aside class="thumbs" bind:this={list} aria-label="Pages">
  <div class="head mono-label">Pages · {pad(editor.pages.length)}</div>
  {#each editor.pages as page (page.index)}
    {@const active = editor.currentPage === page.index}
    <button class="thumb" class:active data-thumb={page.index} aria-current={active ? "page" : undefined} onclick={() => editor.goToPage(page.index)}>
      <span class="sheet">
        <Thumbnail {page} />
        {#if active}
          <svg class="clip" viewBox="0 0 24 60" aria-hidden="true">
            <path
              d="M8 22V9a5 5 0 0 1 10 0v38a8 8 0 0 1-16 0V14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
            />
          </svg>
        {/if}
      </span>
      <span class="folio">
        <span class="num">p.{pad(page.index + 1)}</span>
        {#if pagesNeedingInput.has(page.index)}
          <span class="mark required" title="Required fields still blank">✱</span>
        {:else if pagesWithFields.has(page.index)}
          <span class="mark" title="Has blank fields">•</span>
        {/if}
      </span>
    </button>
  {/each}
</aside>

<style>
  .thumbs {
    flex: none;
    width: 172px;
    overflow-y: auto;
    padding: 14px 14px 28px;
    background: var(--surface-2) var(--grain);
    border-right: 1px solid var(--border-strong);
    box-shadow: inset -6px 0 10px -8px rgba(60, 40, 10, 0.25);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    padding: 2px 4px 0;
  }
  .thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 4px;
    border: none;
    background: transparent;
    color: var(--text-2);
  }
  .sheet {
    position: relative;
    display: block;
    transition: transform 0.15s;
  }
  .thumb:hover .sheet {
    transform: translateY(-2px) rotate(-0.6deg);
  }
  .thumb :global(.thumb-canvas) {
    box-shadow: 0 1px 1px rgba(60, 40, 10, 0.15), 0 6px 12px -8px rgba(60, 40, 10, 0.5);
    transition: box-shadow 0.15s;
  }
  .thumb.active :global(.thumb-canvas) {
    box-shadow: 0 0 0 2px var(--accent), 0 8px 18px -8px rgba(60, 40, 10, 0.55);
  }
  .clip {
    position: absolute;
    top: -12px;
    left: 14px;
    width: 14px;
    height: 36px;
    color: #8a8f99;
    filter: drop-shadow(0 1px 0.5px rgba(0, 0, 0, 0.35));
    animation: clip-on 0.25s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  @keyframes clip-on {
    from {
      transform: translateY(-8px);
      opacity: 0;
    }
  }
  .folio {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .thumb.active .num {
    color: var(--accent-text);
    font-weight: 600;
  }
  .mark {
    color: var(--accent-text);
    font-weight: 700;
    line-height: 1;
  }
  .mark.required {
    color: var(--stamp);
    font-size: 10px;
  }
</style>
