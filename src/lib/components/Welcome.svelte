<script lang="ts">
  import { CalendarDays, Clock, FileText, FolderOpen, LoaderCircle, PenLine, TextCursorInput, X } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import { prefs } from "../storage.svelte";
  import Logo from "./Logo.svelte";

  let { onOpen, onOpenPath }: { onOpen: () => void; onOpenPath: (path: string) => void } = $props();

  function ago(ts: number) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function folder(path: string) {
    const parts = path.split(/[\\/]/);
    parts.pop();
    return parts.slice(-2).join("/");
  }
</script>

<div class="welcome">
  <div class="inner">
    <div class="hero">
      <Logo size={56} />
      <h1>Paperwork</h1>
      <p>Fill out forms, sign contracts, and get back to your day.</p>
    </div>

    <button class="dropzone" onclick={onOpen} disabled={editor.loading}>
      {#if editor.loading}
        <LoaderCircle size={30} class="spin" />
        <span class="dz-title">Opening…</span>
      {:else}
        <span class="dz-icon"><FileText size={26} strokeWidth={1.7} /></span>
        <span class="dz-title">Drop a PDF here</span>
        <span class="dz-sub">or</span>
        <span class="btn primary lg"><FolderOpen size={17} /> Choose a file</span>
        <span class="dz-hint"><span class="kbd">Ctrl</span> <span class="kbd">O</span></span>
      {/if}
    </button>

    <div class="features">
      <div class="feature">
        <span class="f-icon"><TextCursorInput size={18} /></span>
        <div><b>Fill forms</b><span>Type straight into form fields — no printing</span></div>
      </div>
      <div class="feature">
        <span class="f-icon"><PenLine size={18} /></span>
        <div><b>Sign anywhere</b><span>Draw, type, or upload your signature</span></div>
      </div>
      <div class="feature">
        <span class="f-icon"><CalendarDays size={18} /></span>
        <div><b>Dates &amp; checkmarks</b><span>Add text, dates and ticks in one click</span></div>
      </div>
    </div>

    {#if inTauri && prefs.recent.length}
      <section class="recent">
        <h2><Clock size={14} /> Recent</h2>
        <ul>
          {#each prefs.recent as r (r.path)}
            <li>
              <button class="recent-item" onclick={() => onOpenPath(r.path)} title={r.path}>
                <span class="r-icon"><FileText size={16} /></span>
                <span class="r-text">
                  <span class="r-name">{r.name}</span>
                  <span class="r-path">{folder(r.path)}</span>
                </span>
                <span class="r-time">{ago(r.openedAt)}</span>
              </button>
              <button class="icon-btn r-del" aria-label="Remove from recent" onclick={() => prefs.removeRecent(r.path)}>
                <X size={14} />
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>

<style>
  .welcome {
    height: 100%;
    overflow-y: auto;
    background:
      radial-gradient(1200px 500px at 50% -10%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%),
      var(--bg);
  }
  .inner {
    max-width: 640px;
    margin: 0 auto;
    padding: 64px 24px 48px;
  }
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  h1 {
    margin: 16px 0 4px;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .hero p {
    margin: 0;
    color: var(--text-2);
    font-size: 15px;
  }

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-top: 32px;
    padding: 40px 24px 32px;
    border: 1.5px dashed var(--border-strong);
    border-radius: 20px;
    background: var(--surface);
    box-shadow: var(--shadow-md);
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  }
  .dropzone:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: var(--shadow-md), 0 0 0 5px var(--accent-soft);
  }
  .dropzone:disabled {
    cursor: progress;
  }
  .dz-icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: var(--accent-soft);
    color: var(--accent-text);
    margin-bottom: 6px;
  }
  .dz-title {
    font-size: 17px;
    font-weight: 600;
  }
  .dz-sub {
    color: var(--text-3);
    font-size: 13px;
    margin-bottom: 4px;
  }
  .dz-hint {
    margin-top: 8px;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 20px;
  }
  .feature {
    display: flex;
    gap: 10px;
    padding: 14px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    border: 1px solid var(--border);
    font-size: 12.5px;
  }
  .feature b {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }
  .feature span:not(.f-icon) {
    color: var(--text-3);
  }
  .f-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--accent-text);
    border: 1px solid var(--border);
  }

  .recent {
    margin-top: 32px;
  }
  .recent h2 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 8px 4px;
    color: var(--text-3);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .recent ul {
    list-style: none;
    margin: 0;
    padding: 6px;
    border-radius: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .recent li {
    position: relative;
  }
  .recent-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 44px 9px 10px;
    border: none;
    border-radius: 10px;
    background: transparent;
    text-align: left;
  }
  .recent-item:hover {
    background: var(--surface-2);
  }
  .r-icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: var(--danger-soft);
    color: var(--danger);
  }
  .r-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .r-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r-path {
    color: var(--text-3);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r-time {
    flex: none;
    color: var(--text-3);
    font-size: 12px;
  }
  .r-del {
    position: absolute;
    right: 8px;
    top: 50%;
    translate: 0 -50%;
    width: 28px;
    height: 28px;
    opacity: 0;
  }
  .recent li:hover .r-del,
  .r-del:focus-visible {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
