<script lang="ts">
  import { ArrowRight, CalendarDays, Check, Eraser, PenLine, Type, X } from "@lucide/svelte";
  import { editor, isFilled } from "../editor.svelte";
  import type { FieldWidget } from "../types";

  /** One row per field name (the first widget), in document order. */
  const fields = $derived.by(() => {
    const seen = new Set<string>();
    const out: FieldWidget[] = [];
    for (const w of editor.widgets) {
      if (seen.has(w.name) || w.readOnly) continue;
      seen.add(w.name);
      out.push(w);
    }
    return out;
  });

  const byPage = $derived.by(() => {
    const groups = new Map<number, FieldWidget[]>();
    for (const f of fields) {
      if (!groups.has(f.page)) groups.set(f.page, []);
      groups.get(f.page)!.push(f);
    }
    return [...groups.entries()];
  });

  const total = $derived(editor.progressFields.length);
  const done = $derived(total > 0 && editor.filledCount === total);

  const signedNames = $derived(
    new Set(
      editor.widgets
        .filter((w) => w.kind === "signature")
        .filter((w) =>
          editor.items.some(
            (i) => i.type === "image" && i.page === w.page && i.x < w.x + w.w && i.x + i.w > w.x && i.y < w.y + w.h && i.y + i.h > w.y,
          ),
        )
        .map((w) => w.name),
    ),
  );

  function preview(w: FieldWidget): string {
    const v = editor.values[w.name];
    if (w.kind === "checkbox") return v ? "✓" : "";
    if (w.kind === "signature") return signedNames.has(w.name) ? "signed" : "";
    if (w.kind === "radio" || w.kind === "select") {
      const all = editor.widgets.filter((x) => x.name === w.name);
      const opt = all.flatMap((x) => x.options).find((o) => o.value === v);
      return opt?.label ?? String(v ?? "");
    }
    if (Array.isArray(v)) return v.join(", ");
    return w.password && v ? "••••••" : String(v ?? "").replace(/\s*\n\s*/g, " / ");
  }

  function filled(w: FieldWidget) {
    if (w.kind === "signature") return signedNames.has(w.name);
    return isFilled(editor.values[w.name]);
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
</script>

<aside class="panel" aria-label="Checklist">
  <header class="panel-head">
    <h2 class="display">Checklist</h2>
    <span class="mono-label">{fields.length ? "Form" : "No form"}</span>
  </header>

  {#if fields.length}
    <div class="tally">
      <div class="count">
        <span class="big display">{pad(editor.filledCount)}</span>
        <span class="of">/ {pad(total)} filled</span>
      </div>

      {#if total <= 36}
        <div class="gauge" aria-hidden="true">
          {#each Array(total) as _, i (i)}
            <span class="seg" class:on={i < editor.filledCount}></span>
          {/each}
        </div>
      {:else}
        <div class="gauge bar" aria-hidden="true">
          <span class="fill" style:width="{(editor.filledCount / total) * 100}%"></span>
        </div>
      {/if}

      {#if done}
        <div class="complete" role="status">
          <span class="complete-word">Complete</span>
          <span class="complete-date">{today}</span>
        </div>
      {:else}
        {#if editor.missingRequired.length}
          <p class="req">✱ {editor.missingRequired.length} required {editor.missingRequired.length === 1 ? "blank remains" : "blanks remain"}</p>
        {/if}
        <button class="btn primary next" onclick={() => editor.nextEmptyField()}>
          Next blank <ArrowRight size={15} />
        </button>
      {/if}
    </div>

    <div class="ledger">
      {#each byPage as [page, list] (page)}
        <div class="group-head mono-label"><span>Page {pad(page + 1)}</span></div>
        {#each list as w (w.id)}
          {@const ok = filled(w)}
          {@const value = preview(w)}
          <button class="row" class:ok onclick={() => editor.focusField(w)}>
            <span class="box" class:required={w.required && !ok} class:sig={w.kind === "signature"}>
              {#if ok}
                <svg viewBox="0 0 24 24" class="tick" aria-hidden="true">
                  <path d="M3 13.5c2.5 1.6 4.2 3.6 5.6 6.2C11.5 12 15.8 6.6 22 2.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              {:else if w.kind === "signature"}
                <PenLine size={11} strokeWidth={2.4} />
              {/if}
            </span>
            <span class="label">
              {w.label}{#if w.required}<span class="asterisk">✱</span>{/if}
            </span>
            {#if value}
              <span class="value">{value}</span>
            {/if}
          </button>
        {/each}
      {/each}
    </div>

    <footer class="panel-foot">
      <label class="switch">
        <input type="checkbox" bind:checked={editor.highlightFields} />
        <span class="track"><span class="knob"></span></span>
        Show blanks
      </label>
      <button class="btn ghost danger small" onclick={() => editor.clearFields()}>
        <Eraser size={14} /> Erase all
      </button>
    </footer>
  {:else}
    <div class="empty">
      <p class="empty-lede display">Nothing to fill in&nbsp;— so write on it directly.</p>
      <ul>
        <li><span class="kbd">T</span><Type size={15} /><span><b>Text</b> anywhere you click</span></li>
        <li><span class="kbd">S</span><PenLine size={15} /><span><b>Sign</b>: draw, type or upload</span></li>
        <li><span class="kbd">D</span><CalendarDays size={15} /><span><b>Date</b>: today, stamped</span></li>
        <li><span class="kbd">X</span><Check size={15} /><span><b>Tick</b> the boxes</span></li>
        <li><span class="kbd">C</span><X size={15} /><span><b>Cross</b> things out</span></li>
        <li><span class="kbd">W</span><Eraser size={15} /><span><b>Whiteout</b> mistakes</span></li>
      </ul>
    </div>
  {/if}
</aside>

<style>
  .panel {
    flex: none;
    width: 300px;
    display: flex;
    flex-direction: column;
    background: var(--surface) var(--grain);
    border-left: 1px solid var(--border-strong);
    min-height: 0;
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 18px 20px 0;
  }
  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 560;
    font-style: italic;
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 48;
  }

  .tally {
    position: relative;
    padding: 10px 20px 16px;
    border-bottom: 1px solid var(--border-strong);
    box-shadow: 0 3px 0 -2px var(--border);
  }
  .count {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .big {
    font-size: 46px;
    font-weight: 400;
    line-height: 1;
    font-variation-settings: "SOFT" 0, "WONK" 0, "opsz" 144;
    font-variant-numeric: lining-nums tabular-nums;
  }
  .of {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-3);
  }
  .gauge {
    display: flex;
    gap: 3px;
    height: 10px;
    margin: 12px 0 14px;
  }
  .seg {
    flex: 1;
    border-radius: 1px;
    background: var(--surface-3);
    box-shadow: inset 0 0 0 1px var(--border);
    transition: background 0.25s;
  }
  .seg.on {
    background: var(--accent);
    box-shadow: none;
  }
  .gauge.bar {
    position: relative;
    border-radius: 1px;
    background:
      repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--border-strong) calc(10% - 1px) 10%),
      var(--surface-3);
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--accent);
    transition: width 0.3s;
  }
  .req {
    margin: 0 0 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--stamp);
  }
  .next {
    width: 100%;
    justify-content: space-between;
  }

  .complete {
    --rot: -7deg;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    margin: 2px auto 2px;
    padding: 6px 18px 5px;
    border: 3px double var(--stamp);
    border-radius: 6px;
    color: var(--stamp);
    transform: rotate(var(--rot));
    mask-image: var(--stamp-mask);
    animation: stamp-in 0.4s cubic-bezier(0.3, 1.4, 0.5, 1);
  }
  .complete-word {
    font-family: var(--font-mono);
    font-size: 21px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .complete-date {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  /* Ledger paper: ruled rows with a red margin line. */
  .ledger {
    --rule: color-mix(in srgb, var(--accent) 16%, var(--border));
    --margin: 40px;
    position: relative;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 16px;
    background: linear-gradient(90deg, transparent calc(var(--margin) - 1px), color-mix(in srgb, var(--stamp) 35%, transparent) calc(var(--margin) - 1px) calc(var(--margin) + 1px), transparent calc(var(--margin) + 1px)) local;
  }
  .group-head {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    height: 34px;
    padding-left: calc(var(--margin) + 12px);
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 4px 16px 4px 14px;
    border: none;
    border-bottom: 1px solid var(--rule);
    background: transparent;
    text-align: left;
  }
  .row:hover {
    background: color-mix(in srgb, var(--marker) 22%, transparent);
  }
  .box {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 15px;
    height: 15px;
    margin-right: 13px;
    border: 1.5px solid var(--text-2);
    border-radius: 2px;
    color: var(--text-3);
  }
  .box.required {
    border-color: var(--stamp);
  }
  .box.sig {
    border-style: dashed;
  }
  .tick {
    position: absolute;
    left: -2px;
    bottom: 0;
    width: 22px;
    height: 22px;
    color: var(--accent);
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--text);
  }
  .row.ok .label {
    color: var(--text-2);
  }
  .asterisk {
    margin-left: 3px;
    font-size: 10px;
    color: var(--stamp);
    vertical-align: 2px;
  }
  .value {
    flex: none;
    max-width: 48%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-hand);
    font-size: 19px;
    font-weight: 500;
    line-height: 1;
    color: var(--accent-text);
    transform: rotate(-1deg);
  }

  .panel-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 10px 18px;
    border-top: 1px solid var(--border-strong);
    background: var(--surface-2);
  }
  .small {
    height: 30px;
    padding: 0 10px;
    font-size: 13px;
  }
  .switch {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    cursor: pointer;
  }
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    position: relative;
    width: 34px;
    height: 18px;
    border-radius: 3px;
    background: var(--surface-3);
    box-shadow: var(--inset);
    transition: background 0.15s;
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-bottom-width: 2px;
    transition: translate 0.15s;
  }
  .switch input:checked + .track {
    background: var(--accent);
  }
  .switch input:checked + .track .knob {
    translate: 16px 0;
  }
  .switch input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .empty {
    padding: 16px 20px 24px;
  }
  .empty-lede {
    margin: 4px 0 18px;
    font-size: 18px;
    line-height: 1.3;
    font-variation-settings: "SOFT" 100, "WONK" 1;
    color: var(--text-2);
  }
  .empty ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--border);
  }
  .empty li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 2px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-2);
  }
  .empty li :global(svg) {
    flex: none;
    color: var(--text-3);
  }
  .empty b {
    color: var(--text);
    font-weight: 600;
  }

  @media (max-width: 1100px) {
    .panel {
      width: 260px;
    }
  }
</style>
