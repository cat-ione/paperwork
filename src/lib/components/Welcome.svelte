<script lang="ts">
  import { FileText, FolderOpen, LoaderCircle, X } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import { prefs } from "../storage.svelte";
  import Logo from "./Logo.svelte";
  import ThemePicker from "./ThemePicker.svelte";

  let { onOpen, onOpenPath }: { onOpen: () => void; onOpenPath: (path: string) => void } = $props();

  function when(ts: number) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function folder(path: string) {
    const parts = path.split(/[\\/]/);
    parts.pop();
    return parts.join("/");
  }
</script>

<div class="welcome">
  <div class="corner"><ThemePicker /></div>

  <div class="inner">
    <div class="brand">
      <Logo size={28} />
      <span>Paperwork</span>
    </div>

    <button class="drop" onclick={onOpen} disabled={editor.loading}>
      {#if editor.loading}
        <LoaderCircle size={22} class="spin" />
        <span>Opening…</span>
      {:else}
        <FolderOpen size={22} />
        <span class="drop-title">Open a PDF</span>
        <span class="drop-sub">or drop it anywhere · <span class="kbd">Ctrl</span> <span class="kbd">O</span></span>
      {/if}
    </button>

    {#if inTauri && prefs.recent.length}
      <section class="recent">
        <h2 class="mono-label">Recent</h2>
        <ul>
          {#each prefs.recent as r (r.path)}
            <li>
              <button class="entry" onclick={() => onOpenPath(r.path)} title={r.path}>
                <FileText size={16} />
                <span class="entry-name">{r.name}</span>
                <span class="entry-path">{folder(r.path)}</span>
                <span class="entry-time">{when(r.openedAt)}</span>
              </button>
              <button class="icon-btn entry-del" aria-label="Remove {r.name} from recent" onclick={() => prefs.removeRecent(r.path)}>
                <X size={14} />
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if !inTauri}
      <p class="foot">
        Runs in your browser; files never leave your device.
        <a href="https://github.com/cat-ione/paperwork/releases/latest" target="_blank" rel="noreferrer">Desktop app</a>
      </p>
    {/if}
  </div>
</div>

<style>
  .welcome {
    position: relative;
    height: 100%;
    overflow-y: auto;
    background: var(--desk);
  }
  .corner {
    position: absolute;
    top: 10px;
    right: 10px;
  }
  .inner {
    max-width: 560px;
    margin: 0 auto;
    padding: 14vh 24px 48px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    font-size: 17px;
    font-weight: 650;
  }

  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 44px 24px;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text-2);
    transition: border-color 0.1s, background 0.1s;
  }
  .drop:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--surface-2);
    color: var(--accent);
  }
  .drop:disabled {
    cursor: progress;
  }
  .drop-title {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }
  .drop-sub {
    font-size: 13px;
    color: var(--text-3);
  }

  .recent {
    margin-top: 28px;
  }
  .recent h2 {
    margin: 0 0 6px 2px;
  }
  .recent ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    overflow: hidden;
  }
  .recent li {
    position: relative;
  }
  .recent li + li {
    border-top: 1px solid var(--border);
  }
  .entry {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 40px 9px 12px;
    border: none;
    background: transparent;
    color: var(--text-3);
    text-align: left;
  }
  .entry:hover {
    background: var(--surface-2);
  }
  .entry-name {
    flex: none;
    max-width: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-weight: 500;
  }
  .entry-path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .entry-time {
    flex: none;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .entry-del {
    position: absolute;
    right: 6px;
    top: 50%;
    translate: 0 -50%;
    width: 26px;
    height: 26px;
    opacity: 0;
  }
  .recent li:hover .entry-del,
  .entry-del:focus-visible {
    opacity: 1;
  }

  .foot {
    margin: 20px 0 0;
    text-align: center;
    font-size: 12.5px;
    color: var(--text-3);
  }
  .foot a {
    color: var(--accent);
    text-decoration: none;
    margin-left: 4px;
  }
  .foot a:hover {
    text-decoration: underline;
  }
</style>
