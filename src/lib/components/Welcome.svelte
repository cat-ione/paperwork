<script lang="ts">
  import { LoaderCircle } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { inTauri } from "../platform";
  import { prefs } from "../storage.svelte";
  import { applyTheme, getTheme, THEMES } from "../themes";

  let { onOpen, onOpenPath }: { onOpen: () => void; onOpenPath: (path: string) => void } = $props();

  const version = __APP_VERSION__;
  const recent = $derived(prefs.recent.slice(0, 9));
  const current = $derived(getTheme(prefs.theme));

  const SHORTCUTS: [string, string][] = [
    ["t", "text"],
    ["s", "signature"],
    ["i", "initials"],
    ["d", "date"],
    ["x", "check"],
    ["c", "cross"],
    ["w", "whiteout"],
    ["h", "highlight"],
    ["ctrl s", "save"],
    ["ctrl z", "undo"],
  ];

  function when(ts: number) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function folder(path: string) {
    const parts = path.split(/[\\/]/);
    parts.pop();
    return parts.join("/");
  }

  function cycleTheme() {
    const i = THEMES.findIndex((t) => t.id === prefs.theme);
    prefs.setTheme(THEMES[(i + 1) % THEMES.length].id);
  }

  // Keys on the start screen: o open, t next scheme, 1-9 recent files.
  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || editor.loading || editor.passwordPrompt) return;
    const key = e.key.toLowerCase();
    if (key === "o") {
      e.preventDefault();
      onOpen();
    } else if (key === "t") {
      e.preventDefault();
      cycleTheme();
    } else if (inTauri && /^[1-9]$/.test(key) && recent[Number(key) - 1]) {
      e.preventDefault();
      onOpenPath(recent[Number(key) - 1].path);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="home">
  <div class="stage">
    <div class="sheet">
      <span class="crop" aria-hidden="true"></span>

      <div class="col">
        <h1 class="mark">paperwork<span class="cursor" aria-hidden="true"></span></h1>
        <p class="tag">fill in &amp; sign pdf forms.<br />{inTauri ? "nothing leaves your machine." : "runs in your browser, nothing is uploaded."}</p>

        <button class="drop" onclick={onOpen} disabled={editor.loading}>
          {#if editor.loading}
            <span class="drop-main"><LoaderCircle size={16} class="spin" /> opening…</span>
          {:else}
            <span class="drop-arrow" aria-hidden="true">↓</span>
            <svg class="drop-page" viewBox="0 0 96 120" aria-hidden="true">
              <path class="sheet-back" d="M14 10h52l22 22v80H14z" />
              <path d="M8 4h52l22 22v86H8z" />
              <path d="M60 4v22h22" />
              <path d="M20 40h44M20 50h52M20 60h36M20 70h48" />
              <path class="sig" d="M22 96c6-9 10-13 13-10s-5 10 0 8 7-10 12-7 1 7 6 6 7-5 14-5" />
              <path d="M20 103h40" />
            </svg>
            <span class="drop-main">drop a pdf here</span>
            <span class="drop-sub"><span class="k">o</span> open file… <span class="dim">ctrl+o</span></span>
          {/if}
        </button>

        <section class="box">
          <h2 class="box-title">in the editor</h2>
          <dl class="keys">
            {#each SHORTCUTS as [key, label] (key)}
              <div><dt>{key}</dt><dd>{label}</dd></div>
            {/each}
          </dl>
        </section>
      </div>

      <div class="col">
        {#if inTauri}
          <section class="box">
            <h2 class="box-title">recent</h2>
            {#if recent.length}
              <ol class="recent">
                {#each recent as r, i (r.path)}
                  <li>
                    <button class="entry" onclick={() => onOpenPath(r.path)} title={r.path}>
                      <span class="n">{i + 1}</span>
                      <span class="entry-text">
                        <span class="entry-name">{r.name}</span>
                        <span class="entry-path">{folder(r.path)}</span>
                      </span>
                      <span class="entry-time">{when(r.openedAt)}</span>
                    </button>
                    <button class="forget" aria-label="Remove {r.name} from recent" title="Remove from list" onclick={() => prefs.removeRecent(r.path)}>×</button>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="empty">nothing yet. files you open show up here.</p>
            {/if}
          </section>
        {:else}
          <section class="box">
            <h2 class="box-title">web version</h2>
            <ul class="facts">
              <li>everything runs locally in this tab</li>
              <li>saving downloads a filled copy</li>
              <li>
                <a href="https://github.com/cat-ione/paperwork/releases/latest" target="_blank" rel="noreferrer">desktop app ↗</a>
                <span class="dim">saves straight back to the file</span>
              </li>
            </ul>
          </section>
        {/if}

        <section class="box">
          <h2 class="box-title">color scheme <span class="dim">· <span class="k">t</span> to cycle</span></h2>
          <ul class="themes" role="listbox" aria-label="Color scheme" onmouseleave={() => applyTheme(current)}>
            {#each THEMES as t (t.id)}
              <li>
                <button
                  class="theme"
                  class:on={prefs.theme === t.id}
                  role="option"
                  aria-selected={prefs.theme === t.id}
                  onmouseenter={() => applyTheme(t)}
                  onfocus={() => applyTheme(t)}
                  onblur={() => applyTheme(current)}
                  onclick={() => prefs.setTheme(t.id)}
                >
                  <span class="chips" style:background={t.desk}>
                    {#each [t.accent, t.danger, t.success, t.marker, t.text] as c, i (i)}
                      <span style:background={c}></span>
                    {/each}
                  </span>
                  <span class="theme-name">{t.name.toLowerCase()}</span>
                  {#if prefs.theme === t.id}<span class="current">current</span>{/if}
                </button>
              </li>
            {/each}
          </ul>
        </section>
      </div>
    </div>
  </div>

  <footer class="foot">
    <span>paperwork {version}</span>
    <span class="sep">│</span>
    <span>{current.name.toLowerCase()}</span>
    <span class="spacer"></span>
    <span class="dim">drop a file anywhere to open it</span>
  </footer>
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
    font-size: 13px;
    background: var(--desk);
  }
  .stage {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    padding: 56px 48px;
    background-image: radial-gradient(circle, color-mix(in srgb, var(--text-3) 32%, transparent) 1px, transparent 1.3px);
    background-size: 24px 24px;
    background-position: 12px 12px;
    background-attachment: local;
  }

  /* The composition, framed by printer's crop marks. */
  .sheet {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: 44px;
    width: 100%;
    max-width: 1000px;
    margin: auto;
    padding: 36px;
    background: var(--desk);
  }
  .crop {
    --c: var(--text-3);
    --g: 16px;
    --l: 12px;
    position: absolute;
    inset: calc(-1 * var(--g));
    pointer-events: none;
    background:
      linear-gradient(var(--c), var(--c)) 0 var(--g) / var(--l) 1px no-repeat,
      linear-gradient(var(--c), var(--c)) var(--g) 0 / 1px var(--l) no-repeat,
      linear-gradient(var(--c), var(--c)) right 0 top var(--g) / var(--l) 1px no-repeat,
      linear-gradient(var(--c), var(--c)) right var(--g) top 0 / 1px var(--l) no-repeat,
      linear-gradient(var(--c), var(--c)) left 0 bottom var(--g) / var(--l) 1px no-repeat,
      linear-gradient(var(--c), var(--c)) left var(--g) bottom 0 / 1px var(--l) no-repeat,
      linear-gradient(var(--c), var(--c)) right 0 bottom var(--g) / var(--l) 1px no-repeat,
      linear-gradient(var(--c), var(--c)) right var(--g) bottom 0 / 1px var(--l) no-repeat;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 30px;
    min-width: 0;
  }

  .mark {
    margin: 0;
    font-size: 44px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .cursor {
    display: inline-block;
    width: 0.5em;
    height: 0.95em;
    margin-left: 0.08em;
    vertical-align: -0.1em;
    background: var(--accent);
    animation: blink 1.1s steps(1) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .tag {
    margin: -14px 0 0;
    color: var(--text-2);
    line-height: 1.6;
  }

  .k {
    color: var(--accent);
    font-weight: 600;
  }
  .dim {
    color: var(--text-3);
  }

  /* Drop target */
  /* Grows to fill the column so both columns end on the same line. */
  .drop {
    position: relative;
    container-type: size;
    flex: 1 1 auto;
    min-height: 116px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    padding: 22px 22px 20px;
    border: 1px dashed var(--border-strong);
    border-radius: 0;
    background: transparent;
    color: var(--text);
    text-align: left;
    transition: border-color 0.1s, background 0.1s;
  }
  .drop:hover:not(:disabled),
  .drop:focus-visible {
    border-color: var(--accent);
    border-style: solid;
    background: var(--accent-soft);
    outline: none;
  }
  .drop:disabled {
    cursor: progress;
  }
  .drop-arrow {
    position: absolute;
    top: 14px;
    right: 20px;
    font-size: 30px;
    line-height: 1;
    color: var(--text-3);
    transition: transform 0.15s, color 0.1s;
  }
  .drop:hover:not(:disabled) .drop-arrow {
    color: var(--accent);
    transform: translateY(4px);
  }
  /* Hairline page drawing, only when the drop box is tall enough to hold it. */
  .drop-page {
    position: absolute;
    left: 50%;
    top: calc(50% - 30px);
    translate: -50% -50%;
    display: none;
    width: 84px;
    height: 105px;
    fill: none;
    stroke: var(--text-3);
    stroke-width: 1.25;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.15s, stroke 0.1s;
  }
  .drop-page .sheet-back {
    fill: var(--desk);
    opacity: 0.6;
  }
  .drop-page path:nth-child(2) {
    fill: var(--desk);
  }
  .drop-page .sig {
    stroke: var(--accent);
    stroke-width: 1.75;
  }
  @container (min-height: 250px) {
    .drop-page {
      display: block;
    }
  }
  .drop:hover:not(:disabled) .drop-page {
    stroke: var(--text-2);
    transform: translateY(6px);
  }
  .drop-main {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
  }
  .drop-sub {
    color: var(--text-2);
  }

  /* Hairline boxes with the title set into the top rule */
  .box {
    position: relative;
    margin: 0;
    padding: 18px 16px 12px;
    border: 1px solid var(--border-strong);
  }
  .box-title {
    position: absolute;
    top: 0;
    left: 12px;
    translate: 0 -50%;
    margin: 0;
    padding: 0 6px;
    background: var(--desk);
    color: var(--text-3);
    font-size: 11.5px;
    font-weight: 500;
    line-height: 1.4;
  }

  .keys {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 16px;
    margin: 0;
  }
  .keys div {
    display: flex;
    gap: 10px;
  }
  .keys dt {
    min-width: 6ch;
    color: var(--accent);
    font-weight: 600;
  }
  .keys dd {
    margin: 0;
    color: var(--text-2);
  }

  .recent {
    list-style: none;
    margin: 0 -8px;
    padding: 0;
  }
  .recent li {
    position: relative;
  }
  .entry {
    display: flex;
    align-items: baseline;
    gap: 12px;
    width: 100%;
    padding: 5px 36px 5px 8px;
    border: none;
    background: transparent;
    text-align: left;
  }
  .entry:hover {
    background: var(--accent);
    color: var(--on-accent);
  }
  .entry:hover .entry-path,
  .entry:hover .entry-time,
  .entry:hover .n {
    color: inherit;
    opacity: 0.7;
  }
  .n {
    flex: none;
    color: var(--accent);
    font-weight: 600;
  }
  .entry-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .entry-name,
  .entry-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry-path {
    font-size: 11px;
    color: var(--text-3);
  }
  .entry-time {
    flex: none;
    font-size: 11.5px;
    color: var(--text-3);
  }
  .forget {
    position: absolute;
    top: 50%;
    right: 6px;
    translate: 0 -50%;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--on-accent);
    font-size: 15px;
    line-height: 1;
    opacity: 0;
  }
  .recent li:hover .forget,
  .forget:focus-visible {
    opacity: 0.8;
  }
  .forget:hover {
    opacity: 1;
  }
  .empty {
    margin: 0;
    color: var(--text-3);
  }

  .facts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--text-2);
  }
  .facts li::before {
    content: "– ";
    color: var(--text-3);
  }
  .facts a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }
  .facts a:hover {
    text-decoration: underline;
  }

  .themes {
    list-style: none;
    margin: 0 -8px;
    padding: 0;
  }
  .theme {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 5px 8px;
    border: none;
    background: transparent;
    text-align: left;
  }
  .theme:hover {
    background: var(--surface-3);
  }
  .theme.on {
    background: var(--accent);
    color: var(--on-accent);
  }
  .current {
    flex: none;
    font-size: 11px;
    opacity: 0.7;
  }
  .chips {
    flex: none;
    display: flex;
    gap: 2px;
    padding: 3px;
    outline: 1px solid color-mix(in srgb, var(--text-3) 40%, transparent);
  }
  .chips span {
    width: 6px;
    height: 10px;
  }
  .theme-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .foot {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 26px;
    padding: 0 14px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    font-size: 11.5px;
    white-space: nowrap;
  }
  .sep {
    color: var(--border-strong);
  }
  .spacer {
    flex: 1;
  }

  @media (max-width: 900px) {
    .stage {
      padding: 40px 28px;
    }
    .sheet {
      grid-template-columns: minmax(0, 1fr);
      gap: 30px;
      padding: 24px;
    }
  }
</style>
