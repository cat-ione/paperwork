<script lang="ts">
  import { editor, isFilled } from "../editor.svelte";
  import Thumbnail from "./Thumbnail.svelte";

  let list: HTMLElement;

  /** Pages with empty required fields get a red dot; other empty fields an accent dot. */
  const pagesNeedingInput = $derived(new Set(editor.missingRequired.map((w) => w.page)));
  const pagesWithFields = $derived(
    new Set(editor.widgets.filter((w) => !w.readOnly && !isFilled(editor.values[w.name])).map((w) => w.page)),
  );

  // Keep the active thumbnail in view while scrolling the document.
  $effect(() => {
    const el = list?.querySelector(`[data-thumb="${editor.currentPage}"]`);
    el?.scrollIntoView({ block: "nearest" });
  });
</script>

<aside class="thumbs" bind:this={list} aria-label="Pages">
  {#each editor.pages as page (page.index)}
    {@const active = editor.currentPage === page.index}
    <button class="thumb" class:active data-thumb={page.index} aria-current={active ? "page" : undefined} onclick={() => editor.goToPage(page.index)}>
      <Thumbnail {page} />
      <span class="num">
        {page.index + 1}
        {#if pagesNeedingInput.has(page.index)}
          <span class="dot required" title="Required fields empty"></span>
        {:else if pagesWithFields.has(page.index)}
          <span class="dot" title="Empty fields"></span>
        {/if}
      </span>
    </button>
  {/each}
</aside>

<style>
  .thumbs {
    flex: none;
    width: 168px;
    overflow-y: auto;
    padding: 14px 12px 24px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .thumb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-3);
  }
  .thumb:hover {
    background: var(--surface-2);
  }
  .thumb :global(.thumb-canvas) {
    box-shadow: 0 0 0 1px var(--border);
  }
  .thumb.active :global(.thumb-canvas) {
    box-shadow: 0 0 0 2px var(--accent);
  }
  .thumb.active .num {
    color: var(--accent);
    font-weight: 600;
  }
  .num {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .dot.required {
    background: var(--danger);
  }
</style>
