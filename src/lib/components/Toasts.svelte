<script lang="ts">
  import { CircleAlert, CircleCheck, Info, X } from "@lucide/svelte";
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
  import { toasts } from "../toast.svelte";
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.list as t (t.id)}
    <div class="toast {t.kind}" animate:flip={{ duration: 180 }} transition:fly={{ y: 12, duration: 180 }}>
      <span class="icon">
        {#if t.kind === "success"}<CircleCheck size={18} />{:else if t.kind === "error"}<CircleAlert size={18} />{:else}<Info size={18} />{/if}
      </span>
      <span class="msg">{t.message}</span>
      <button class="close" aria-label="Dismiss" onclick={() => toasts.dismiss(t.id)}><X size={14} /></button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 120;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: min(420px, calc(100vw - 40px));
  }
  .toast {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 10px 11px 14px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    font-size: 13.5px;
  }
  .icon {
    flex: none;
    display: grid;
    margin-top: 1px;
  }
  .success .icon {
    color: var(--success);
  }
  .error .icon {
    color: var(--danger);
  }
  .info .icon {
    color: var(--accent);
  }
  .msg {
    flex: 1;
    user-select: text;
  }
  .close {
    flex: none;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-3);
  }
  .close:hover {
    background: var(--surface-3);
    color: var(--text);
  }
</style>
