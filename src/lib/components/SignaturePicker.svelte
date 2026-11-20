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
    {#if editor.signTarget}Signing “{editor.signTarget.label}”{:else}{noun === "signature" ? "Signatures" : "Initials"} on file{/if}
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
    top: calc(100% + 12px);
    left: 50%;
    translate: -50% 0;
    width: 300px;
    padding: 8px;
  }
  .head {
    padding: 4px 6px 10px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sig-row {
    position: relative;
  }
  /* Each saved signature is a little specimen card, signed on the line. */
  .sig {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 78px;
    padding: 10px 20px 16px;
    border: none;
    border-radius: 2px;
    background: #fffdf7;
    box-shadow: 0 1px 2px rgba(60, 40, 10, 0.2);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .sig::after {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 14px;
    border-bottom: 1px solid #c7baa0;
  }
  .sig:hover {
    transform: translateY(-1px) rotate(-0.6deg);
    box-shadow: 0 0 0 2px var(--accent), 0 6px 14px -6px rgba(60, 40, 10, 0.45);
  }
  .sig img {
    position: relative;
    z-index: 1;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .del {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 2;
    width: 26px;
    height: 26px;
    opacity: 0;
    color: #958b79;
  }
  .del:hover {
    background: #f5e0d8 !important;
    color: #b8321f !important;
  }
  .sig-row:hover .del,
  .del:focus-visible {
    opacity: 1;
  }
  .add {
    margin-top: 8px;
    border: 1px dashed var(--border-strong);
    justify-content: center;
    color: var(--accent-text);
  }
  .add:hover {
    border-color: var(--accent);
  }
</style>
