<script lang="ts">
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
  import { toasts } from "../toast.svelte";
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.list as t (t.id)}
    <div class="toast {t.kind}" animate:flip={{ duration: 180 }} transition:fly={{ y: 12, duration: 180 }}>
      <div class="paper">
        <span class="icon">
          {#if t.kind === "success"}<CircleCheck size={17} />{:else if t.kind === "error"}<CircleAlert size={17} />{:else}<Info size={17} />{/if}
        </span>
        <span class="msg">{t.message}</span>
        <button class="close" aria-label="Dismiss" onclick={() => toasts.dismiss(t.id)}><X size={14} /></button>
      </div>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 120;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-width: min(380px, calc(100vw - 32px));
  }
  .paper {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 9px 8px 9px 12px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--kind);
    box-shadow: var(--shadow-md);
    color: var(--text);
    font-size: 13px;
  }
  .success {
    --kind: var(--success);
  }
  .error {
    --kind: var(--danger);
  }
  .info {
    --kind: var(--accent);
  }
  .icon {
    flex: none;
    display: grid;
    margin-top: 1px;
    color: var(--kind);
  }
  .msg {
    flex: 1;
    user-select: text;
  }
  .close {
    flex: none;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-3);
  }
  .close:hover {
    background: var(--surface-3);
    color: var(--text);
  }
</style>
