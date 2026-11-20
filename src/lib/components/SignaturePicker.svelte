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
    {#if editor.signTarget}{editor.signTarget.label}{:else}Saved {noun}{/if}
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
    <Plus size={16} /> New {noun}
  </button>
</div>

<style>
  .picker {
    top: calc(100% + 10px);
    left: 50%;
    translate: -50% 0;
    width: 280px;
  }
  .head {
    padding: 4px 6px 8px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
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
    height: 70px;
    padding: 8px 16px;
    border: 2px solid transparent;
    border-radius: var(--radius);
    background: #fff;
  }
  .sig:hover {
    border-color: var(--accent);
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
    width: 26px;
    height: 26px;
    opacity: 0;
    color: #6c6f85;
  }
  .del:hover {
    background: #fde4e8 !important;
    color: #d20f39 !important;
  }
  .sig-row:hover .del,
  .del:focus-visible {
    opacity: 1;
  }
  .add {
    margin-top: 6px;
    color: var(--accent);
  }
</style>
