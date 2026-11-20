<script lang="ts">
  import { editor, isFilled } from "../editor.svelte";
  import Thumbnail from "./Thumbnail.svelte";

  let list: HTMLElement;

  /** Pages with required fields still empty get a small marker. */
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
    <button
      class="thumb"
      class:active={editor.currentPage === page.index}
      data-thumb={page.index}
      onclick={() => editor.goToPage(page.index)}
    >
      <Thumbnail {page} />
      <span class="num">
        {page.index + 1}
        {#if pagesNeedingInput.has(page.index)}
          <span class="mark required" title="Required fields to fill"></span>
        {:else if pagesWithFields.has(page.index)}
          <span class="mark" title="Has empty fields"></span>
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
    padding: 16px 12px 24px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 14px;
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
    color: var(--text-2);
  }
  .thumb:hover {
    background: var(--surface-2);
  }
  .thumb :global(.thumb-canvas) {
    outline: 1px solid var(--border);
    transition: outline-color 0.12s, box-shadow 0.12s;
  }
  .thumb.active :global(.thumb-canvas) {
    outline: 2px solid var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  .thumb.active .num {
    color: var(--accent-text);
    font-weight: 600;
  }
  .num {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .mark {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .mark.required {
    background: var(--danger);
  }
</style>
