<script lang="ts">
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
    <h2 id="pw-title">Password required</h2>
    <p>{prompt.retry ? "Wrong password." : "This PDF is password-protected."}</p>
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
    background: rgba(0, 0, 0, 0.5);
    animation: fade-in 0.1s;
  }
  .dialog {
    width: min(360px, calc(100% - 32px));
    padding: 18px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    animation: pop-in 0.12s ease-out;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 650;
  }
  p {
    margin: 0 0 14px;
    color: var(--text-2);
    font-size: 13px;
  }
  input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    outline: none;
  }
  input:focus {
    border-color: var(--accent);
  }
  input.error {
    border-color: var(--danger);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
</style>
