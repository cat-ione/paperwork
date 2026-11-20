<script lang="ts">
  import { Plus, Trash2 } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { prefs } from "../storage.svelte";

  let { kind }: { kind: "signature" | "initials" } = $props();

  const saved = $derived(prefs.signatures.filter((s) => s.kind === kind));
  const noun = $derived(kind === "signature" ? "signature" : "initials");
</script>

<svelte:window onpointerdown={() => (editor.signaturePicker = null)} />

<div class="popover picker" onpointerdown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-label="Choose {noun}">
  <div class="head">
    {#if editor.signTarget}Sign “{editor.signTarget.label}”{:else}Choose a {noun}{/if}
  </div>
  <div class="list">
    {#each saved as sig (sig.id)}
      <div class="sig-row">
        <button class="sig" onclick={() => editor.useSignature(sig)} title="Use this {noun}">
          <img src={sig.src} alt="Saved {noun}" draggable="false" />
        </button>
        <button
          class="icon-btn del"
          aria-label="Delete saved {noun}"
          onclick={() => prefs.removeSignature(sig.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    {/each}
  </div>
  <button
    class="menu-item add"
    onclick={() => {
      editor.signaturePicker = null;
      editor.signatureDialog = kind;
    }}
  >
    <Plus size={16} /> Create new {noun}
  </button>
</div>

<style>
  .picker {
    top: calc(100% + 10px);
    left: 50%;
    translate: -50% 0;
    width: 300px;
  }
  .head {
    padding: 6px 8px 8px;
    color: var(--text-3);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sig-row {
    position: relative;
  }
  .sig {
    display: grid;
    place-items: center;
    width: 100%;
    height: 76px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: #fff;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .sig:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .sig img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .del {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 28px;
    height: 28px;
    opacity: 0;
    color: #6b7280;
  }
  .del:hover {
    background: #fee2e2 !important;
    color: #dc2626 !important;
  }
  .sig-row:hover .del,
  .del:focus-visible {
    opacity: 1;
  }
  .add {
    margin-top: 6px;
    color: var(--accent-text);
    font-weight: 500;
  }
</style>
