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
    right: 22px;
    bottom: 22px;
    z-index: 120;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    max-width: min(380px, calc(100vw - 44px));
  }
  /* A torn-off receipt. */
  .toast {
    filter: drop-shadow(0 1px 1px rgba(60, 40, 10, 0.2)) drop-shadow(0 10px 14px rgba(60, 40, 10, 0.25));
  }
  .paper {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px 10px 16px 14px;
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    -webkit-mask:
      radial-gradient(circle 5px at 50% 100%, transparent 98%, #000) bottom / 12px 6px repeat-x,
      linear-gradient(#000, #000) top / 100% calc(100% - 6px) no-repeat;
    mask:
      radial-gradient(circle 5px at 50% 100%, transparent 98%, #000) bottom / 12px 6px repeat-x,
      linear-gradient(#000, #000) top / 100% calc(100% - 6px) no-repeat;
  }
  .toast:nth-child(odd) {
    rotate: -0.6deg;
  }
  .toast:nth-child(even) {
    rotate: 0.5deg;
  }
  .paper::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 6px;
    width: 3px;
    background: var(--kind);
  }
  .success {
    --kind: var(--success);
  }
  .error {
    --kind: var(--stamp);
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
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-3);
  }
  .close:hover {
    background: var(--surface-3);
    color: var(--text);
  }
</style>
