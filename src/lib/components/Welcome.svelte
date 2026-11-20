<script lang="ts">
  import { ArrowUpRight, FolderOpen, LoaderCircle, X } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import { prefs } from "../storage.svelte";
  import Logo from "./Logo.svelte";

  let { onOpen, onOpenPath }: { onOpen: () => void; onOpenPath: (path: string) => void } = $props();

  function when(ts: number) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
    return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  }

  function folder(path: string) {
    const parts = path.split(/[\\/]/);
    parts.pop();
    return parts.slice(-2).join("/");
  }

  const pad = (n: number) => String(n).padStart(2, "0");
</script>

<div class="welcome">
  <div class="inner">
    <header class="masthead">
      <div class="brand">
        <Logo size={34} />
        <span class="wordmark display">Paperwork</span>
      </div>
      <span class="mono-label">Forms · Contracts · Signatures</span>
    </header>

    <h1 class="display">
      Fill it in, sign it,
      <em>send it off.</em>
    </h1>
    <p class="lede">
      A quiet desk for the paperwork you'd rather not print. Type into form fields, sign with your own
      hand and stamp the date. Nothing leaves your computer.
    </p>

    <!-- The drop target: a manila folder with a sheet peeking out. -->
    <button class="folder" onclick={onOpen} disabled={editor.loading} aria-label="Open a PDF">
      <span class="folder-back"></span>
      <span class="sheet sheet-2"></span>
      <span class="sheet sheet-1">
        <span class="sheet-lines"></span>
        <span class="sheet-sign">✕ <span class="sig-line"></span></span>
      </span>
      <span class="folder-front">
        {#if editor.loading}
          <span class="front-title display"><LoaderCircle size={22} class="spin" /> Opening…</span>
        {:else}
          <span class="front-label mono-label">Inbox</span>
          <span class="front-title display">Drop a PDF in the folder</span>
          <span class="front-actions">
            <span class="btn primary lg"><FolderOpen size={17} /> Choose a file</span>
            <span class="front-or">or press <span class="kbd">Ctrl</span> <span class="kbd">O</span></span>
          </span>
        {/if}
      </span>
    </button>

    <ol class="steps">
      <li>
        <span class="step-no">01</span>
        <div><b>Fill the blanks</b><span>Type straight into the form. The checklist tracks what's left.</span></div>
      </li>
      <li>
        <span class="step-no">02</span>
        <div><b>Sign in ink</b><span>Draw, type or upload your signature. It's kept on file for next time.</span></div>
      </li>
      <li>
        <span class="step-no">03</span>
        <div><b>File it away</b><span>Save, or flatten a copy that's ready to send.</span></div>
      </li>
    </ol>

    {#if !inTauri}
      <a class="desktop" href="https://github.com/cat-ione/paperwork/releases/latest" target="_blank" rel="noreferrer">
        <span>
          <b>Get the desktop edition</b>
          <span class="sub">Saves straight back to your files. Free for Windows, macOS &amp; Linux.</span>
        </span>
        <ArrowUpRight size={18} />
      </a>
    {/if}

    {#if inTauri && prefs.recent.length}
      <section class="recent">
        <div class="recent-head">
          <h2 class="mono-label">Recently filed</h2>
        </div>
        <ul>
          {#each prefs.recent as r, i (r.path)}
            <li>
              <button class="entry" onclick={() => onOpenPath(r.path)} title={r.path}>
                <span class="entry-no">{pad(i + 1)}</span>
                <span class="entry-text">
                  <span class="entry-name">{r.name}</span>
                  <span class="entry-path">{folder(r.path)}</span>
                </span>
                <span class="leader"></span>
                <span class="entry-time">{when(r.openedAt)}</span>
              </button>
              <button class="icon-btn entry-del" aria-label="Remove {r.name} from recent files" onclick={() => prefs.removeRecent(r.path)}>
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
      radial-gradient(ellipse 70% 55% at 50% 30%, color-mix(in srgb, var(--surface) 55%, transparent), transparent 75%),
      var(--grain),
      var(--desk);
  }
  .inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 28px 56px;
  }

  .masthead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-strong);
    box-shadow: 0 3px 0 -2px var(--border-strong);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .wordmark {
    font-size: 24px;
    font-style: italic;
    font-weight: 540;
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 36;
  }

  h1 {
    margin: 40px 0 0;
    font-size: clamp(40px, 7vw, 64px);
    font-weight: 380;
    line-height: 1;
    letter-spacing: -0.03em;
    font-variation-settings: "SOFT" 30, "WONK" 0, "opsz" 144;
  }
  h1 em {
    display: block;
    font-style: italic;
    font-weight: 450;
    color: var(--accent-text);
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 144;
  }
  .lede {
    max-width: 520px;
    margin: 18px 0 0;
    font-size: 15.5px;
    line-height: 1.55;
    color: var(--text-2);
  }

  /* ---- Manila folder ---- */
  .folder {
    position: relative;
    display: block;
    width: 100%;
    height: 280px;
    margin-top: 40px;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    color: var(--manila-ink);
  }
  .folder:disabled {
    cursor: progress;
  }
  .folder-back {
    position: absolute;
    inset: 0;
    top: 6px;
    background: var(--manila-dark);
    border-radius: 4px 10px 10px 10px;
    clip-path: polygon(0 0, 34% 0, calc(34% + 26px) 34px, 100% 34px, 100% 100%, 0 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  .sheet {
    position: absolute;
    left: 7%;
    right: 7%;
    top: 22px;
    height: 220px;
    background: #fbf8f1;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(60, 40, 10, 0.25);
    transition: transform 0.35s cubic-bezier(0.3, 1.3, 0.5, 1);
  }
  .sheet-2 {
    transform: rotate(2.4deg) translateY(10px);
    background: #f1ece0;
  }
  .sheet-1 {
    transform: rotate(-1.4deg);
    padding: 22px 28px;
  }
  .sheet-lines {
    display: block;
    height: 40px;
    background: repeating-linear-gradient(#d7cdb9 0 2px, transparent 2px 12px);
    width: 62%;
  }
  .sheet-sign {
    position: absolute;
    top: 64px;
    right: 28px;
    display: flex;
    align-items: flex-end;
    gap: 6px;
    width: 40%;
    font-family: var(--font-display);
    font-size: 14px;
    color: #b8321f;
  }
  .sig-line {
    flex: 1;
    border-bottom: 1.5px solid #c7baa0;
    margin-bottom: 3px;
  }
  .folder:hover:not(:disabled) .sheet-1 {
    transform: rotate(-2.5deg) translateY(-22px);
  }
  .folder:hover:not(:disabled) .sheet-2 {
    transform: rotate(3.5deg) translateY(-6px);
  }
  .folder-front {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 178px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 0 32px;
    background:
      var(--grain),
      linear-gradient(175deg, var(--manila), var(--manila-dark));
    border-radius: 3px 3px 10px 10px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -2px 0 var(--manila-edge),
      0 18px 30px -16px rgba(60, 40, 10, 0.55);
    transform-origin: bottom;
    transition: transform 0.3s;
  }
  .folder:hover:not(:disabled) .folder-front {
    transform: perspective(900px) rotateX(-7deg);
  }
  .folder:focus-visible {
    outline: none;
  }
  .folder:focus-visible .folder-front {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .front-label {
    color: inherit;
    opacity: 0.6;
  }
  .front-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 26px;
    font-weight: 500;
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
  .front-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 10px;
  }
  .front-or {
    font-size: 13px;
    opacity: 0.75;
  }
  .front-or .kbd {
    background: color-mix(in srgb, var(--manila-ink) 10%, transparent);
    border-color: color-mix(in srgb, var(--manila-ink) 40%, transparent);
    color: inherit;
  }

  /* ---- Steps ---- */
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin: 36px 0 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border-strong);
  }
  .steps li {
    display: flex;
    gap: 12px;
    padding: 16px 16px 4px 0;
    font-size: 13px;
  }
  .steps li + li {
    padding-left: 16px;
    border-left: 1px solid var(--border);
  }
  .step-no {
    font-family: var(--font-display);
    font-size: 26px;
    font-style: italic;
    line-height: 1;
    color: var(--stamp);
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
  .steps b {
    display: block;
    margin-bottom: 2px;
    font-weight: 650;
  }
  .steps span:not(.step-no) {
    color: var(--text-2);
  }

  .desktop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 28px;
    padding: 16px 18px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius);
    color: inherit;
    text-decoration: none;
    font-size: 13px;
    transition: background 0.15s, border-color 0.15s;
  }
  .desktop:hover {
    background: color-mix(in srgb, var(--surface) 60%, transparent);
    border-color: var(--accent);
    color: var(--accent-text);
  }
  .desktop b {
    display: block;
    font-weight: 650;
  }
  .desktop .sub {
    color: var(--text-3);
  }

  /* ---- Recent files: a ledger with dotted leaders ---- */
  .recent {
    margin-top: 40px;
  }
  .recent-head {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-strong);
  }
  .recent h2 {
    margin: 0;
  }
  .recent ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .recent li {
    position: relative;
    border-bottom: 1px solid var(--border);
  }
  .entry {
    display: flex;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    padding: 11px 44px 11px 4px;
    border: none;
    background: transparent;
    text-align: left;
  }
  .entry:hover {
    background: color-mix(in srgb, var(--marker) 22%, transparent);
  }
  .entry-no {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-3);
  }
  .entry-text {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .entry-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry-path {
    color: var(--text-3);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .leader {
    flex: 1;
    min-width: 16px;
    border-bottom: 1.5px dotted var(--border-strong);
  }
  .entry-time {
    flex: none;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-3);
  }
  .entry-del {
    position: absolute;
    right: 4px;
    top: 50%;
    translate: 0 -50%;
    width: 28px;
    height: 28px;
    opacity: 0;
  }
  .recent li:hover .entry-del,
  .entry-del:focus-visible {
    opacity: 1;
  }

  @media (max-width: 680px) {
    .steps {
      grid-template-columns: 1fr;
    }
    .steps li + li {
      padding-left: 0;
      border-left: none;
    }
    .front-title {
      font-size: 21px;
    }
  }
</style>
