<script lang="ts">
  import { LockKeyhole } from "@lucide/svelte";

  let { prompt }: { prompt: { retry: boolean; resolve: (pw: string | null) => void } } = $props();

  let password = $state("");
</script>

<div class="backdrop" role="dialog" aria-modal="true" aria-labelledby="pw-title">
  <form
    class="dialog"
    onsubmit={(e) => {
      e.preventDefault();
      prompt.resolve(password);
    }}
  >
    <div class="icon"><LockKeyhole size={22} /></div>
    <h2 id="pw-title">Password required</h2>
    <p>{prompt.retry ? "That password didn't work. Try again." : "This PDF is protected. Enter its password to open it."}</p>
    <!-- svelte-ignore a11y_autofocus -->
    <input type="password" bind:value={password} placeholder="Password" autofocus class:error={prompt.retry} />
    <div class="actions">
      <button type="button" class="btn" onclick={() => prompt.resolve(null)}>Cancel</button>
      <button type="submit" class="btn primary" disabled={!password}>Unlock</button>
    </div>
  </form>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    background: rgba(10, 12, 18, 0.45);
    backdrop-filter: blur(4px);
    animation: fade-in 0.15s;
  }
  .dialog {
    width: min(380px, calc(100% - 32px));
    padding: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
    animation: pop-in 0.18s ease-out;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  h2 {
    margin: 14px 0 4px;
    font-size: 17px;
  }
  p {
    margin: 0 0 16px;
    color: var(--text-3);
    font-size: 13px;
  }
  input {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    background: var(--surface);
    outline: none;
  }
  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  input.error {
    border-color: var(--danger);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
  }
</style>
