<script lang="ts">
  import { ArrowRight, CalendarDays, Check, Circle, CircleCheck, Eraser, MousePointerClick, PenLine, Type } from "@lucide/svelte";
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
  const pct = $derived(total ? editor.filledCount / total : 0);
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
    if (w.kind === "checkbox") return v ? "Checked" : "";
    if (w.kind === "signature") return signedNames.has(w.name) ? "Signed" : "";
    if (w.kind === "radio" || w.kind === "select") {
      const all = editor.widgets.filter((x) => x.name === w.name);
      const opt = all.flatMap((x) => x.options).find((o) => o.value === v);
      return opt?.label ?? String(v ?? "");
    }
    if (Array.isArray(v)) return v.join(", ");
    return w.password && v ? "••••••" : String(v ?? "");
  }

  function filled(w: FieldWidget) {
    if (w.kind === "signature") return signedNames.has(w.name);
    return isFilled(editor.values[w.name]);
  }

  const R = 22;
  const C = 2 * Math.PI * R;
</script>

<aside class="panel" aria-label="Form">
  {#if fields.length}
    <div class="summary">
      <div class="ring" class:done>
        <svg viewBox="0 0 56 56" width="56" height="56">
          <circle cx="28" cy="28" r={R} class="track" />
          <circle cx="28" cy="28" r={R} class="bar" stroke-dasharray={C} stroke-dashoffset={C * (1 - pct)} />
        </svg>
        <span class="ring-label">
          {#if done}<Check size={20} strokeWidth={3} />{:else}{Math.round(pct * 100)}%{/if}
        </span>
      </div>
      <div class="summary-text">
        <div class="title">{done ? "All filled in" : "Fill out form"}</div>
        <div class="sub">
          {editor.filledCount} of {total} fields completed
          {#if editor.missingRequired.length}
            · <span class="req">{editor.missingRequired.length} required</span>
          {/if}
        </div>
      </div>
    </div>
    {#if !done}
      <button class="btn next" onclick={() => editor.nextEmptyField()}>
        Next empty field <ArrowRight size={15} />
      </button>
    {/if}

    <div class="list">
      {#each byPage as [page, list] (page)}
        <div class="group-head">Page {page + 1}</div>
        {#each list as w (w.id)}
          {@const ok = filled(w)}
          <button class="row" onclick={() => editor.focusField(w)}>
            <span class="status" class:ok class:required={w.required && !ok}>
              {#if ok}<CircleCheck size={16} />{:else if w.kind === "signature"}<PenLine size={15} />{:else}<Circle size={16} />{/if}
            </span>
            <span class="row-text">
              <span class="label">
                {w.label}{#if w.required}<span class="asterisk">*</span>{/if}
              </span>
              {#if preview(w)}
                <span class="value">{preview(w)}</span>
              {/if}
            </span>
          </button>
        {/each}
      {/each}
    </div>

    <div class="footer">
      <label class="switch">
        <input type="checkbox" bind:checked={editor.highlightFields} />
        <span class="track-sw"><span class="thumb-sw"></span></span>
        Highlight fields
      </label>
      <button class="btn ghost danger small" onclick={() => editor.clearFields()}>Clear form</button>
    </div>
  {:else}
    <div class="empty">
      <div class="empty-icon"><MousePointerClick size={22} /></div>
      <div class="title">No fillable fields</div>
      <p>This PDF has no form fields, but you can still fill it in with the tools above:</p>
      <ul>
        <li><span class="ti"><Type size={15} /></span><span><b>Text</b> — click anywhere and type</span></li>
        <li><span class="ti"><PenLine size={15} /></span><span><b>Sign</b> — draw, type or upload a signature</span></li>
        <li><span class="ti"><CalendarDays size={15} /></span><span><b>Date</b> — stamp today's date</span></li>
        <li><span class="ti"><Check size={15} /></span><span><b>Check</b> — tick boxes on the page</span></li>
        <li><span class="ti"><Eraser size={15} /></span><span><b>Whiteout</b> — cover up mistakes</span></li>
      </ul>
    </div>
  {/if}
</aside>

<style>
  .panel {
    flex: none;
    width: 292px;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-left: 1px solid var(--border);
    min-height: 0;
  }
  .summary {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 18px 14px;
  }
  .ring {
    position: relative;
    flex: none;
    width: 56px;
    height: 56px;
  }
  .ring svg {
    transform: rotate(-90deg);
  }
  .ring circle {
    fill: none;
    stroke-width: 5;
  }
  .track {
    stroke: var(--surface-3);
  }
  .bar {
    stroke: var(--accent);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.35s ease, stroke 0.2s;
  }
  .ring.done .bar {
    stroke: var(--success);
  }
  .ring-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .ring.done .ring-label {
    color: var(--success);
  }
  .title {
    font-size: 15px;
    font-weight: 650;
  }
  .sub {
    color: var(--text-3);
    font-size: 12.5px;
  }
  .req {
    color: var(--danger);
    font-weight: 500;
  }
  .next {
    margin: 0 18px 12px;
    justify-content: space-between;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 10px 12px;
    border-top: 1px solid var(--border);
  }
  .group-head {
    position: sticky;
    top: 0;
    padding: 12px 8px 6px;
    background: var(--surface);
    color: var(--text-3);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    z-index: 1;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: 7px 8px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    text-align: left;
  }
  .row:hover {
    background: var(--surface-2);
  }
  .status {
    flex: none;
    display: grid;
    place-items: center;
    margin-top: 1px;
    color: var(--text-3);
  }
  .status.ok {
    color: var(--success);
  }
  .status.required {
    color: var(--danger);
  }
  .row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .asterisk {
    margin-left: 2px;
    color: var(--danger);
  }
  .value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-3);
    font-size: 12px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 10px 18px;
    border-top: 1px solid var(--border);
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
    color: var(--text-2);
    cursor: pointer;
  }
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track-sw {
    position: relative;
    width: 32px;
    height: 18px;
    border-radius: 99px;
    background: var(--border-strong);
    transition: background 0.15s;
  }
  .thumb-sw {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: translate 0.15s;
  }
  .switch input:checked + .track-sw {
    background: var(--accent);
  }
  .switch input:checked + .track-sw .thumb-sw {
    translate: 14px 0;
  }
  .switch input:focus-visible + .track-sw {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .empty {
    padding: 28px 22px;
    color: var(--text-2);
  }
  .empty-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-bottom: 14px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent-text);
  }
  .empty p {
    margin: 6px 0 16px;
    font-size: 13px;
    color: var(--text-3);
  }
  .empty ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
  }
  .empty li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ti {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-2);
  }
  .empty b {
    color: var(--text);
    font-weight: 600;
  }

  @media (max-width: 1100px) {
    .panel {
      width: 250px;
    }
  }
</style>
