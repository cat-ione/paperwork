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
    <h2 id="pw-title">Sealed document</h2>
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
    background: rgba(28, 20, 8, 0.45);
    backdrop-filter: blur(3px) sepia(0.3);
    animation: fade-in 0.15s;
  }
  .dialog {
    width: min(390px, calc(100% - 32px));
    padding: 26px 26px 22px;
    background: var(--surface) var(--grain);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    box-shadow: var(--shadow-lg);
    animation: pop-in 0.18s ease-out;
  }
  /* A wax seal. */
  .icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--stamp) 70%, white), var(--stamp) 55%);
    box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--stamp) 80%, black), 0 2px 4px rgba(60, 20, 10, 0.35);
    color: #fbf8f1;
  }
  h2 {
    margin: 16px 0 4px;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 500;
    font-style: italic;
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
  p {
    margin: 0 0 18px;
    color: var(--text-2);
    font-size: 13px;
  }
  input {
    width: 100%;
    height: 42px;
    padding: 0 2px;
    border: none;
    border-bottom: 1.5px solid var(--text-2);
    border-radius: 0;
    background: transparent;
    font-family: var(--font-mono);
    font-size: 15px;
    letter-spacing: 0.1em;
    outline: none;
  }
  input:focus {
    border-bottom-color: var(--accent);
  }
  input.error {
    border-bottom-color: var(--stamp);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 22px;
  }
</style>
