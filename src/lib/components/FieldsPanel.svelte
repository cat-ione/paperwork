<script lang="ts">
  import { ArrowRight, Check, CircleCheck, Circle, Eraser, PenLine } from "@lucide/svelte";
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
    if (w.kind === "signature") return signedNames.has(w.name) ? "Signed" : "";
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
</script>

<aside class="panel" aria-label="Fields">
  <header class="head">
    <h2>Fields</h2>
    {#if total}
      <span class="count" class:done>{editor.filledCount}/{total}</span>
    {/if}
  </header>

  {#if fields.length}
    <div class="progress">
      <div class="bar" class:done><span style:width="{total ? (editor.filledCount / total) * 100 : 0}%"></span></div>
      {#if done}
        <p class="status ok"><Check size={14} strokeWidth={2.5} /> All filled</p>
      {:else}
        {#if editor.missingRequired.length}
          <p class="status req">{editor.missingRequired.length} required left</p>
        {/if}
        <button class="btn next" onclick={() => editor.nextEmptyField()}>
          Next empty <ArrowRight size={14} />
        </button>
      {/if}
    </div>

    <div class="list">
      {#each byPage as [page, list] (page)}
        {#if byPage.length > 1}<div class="group mono-label">Page {page + 1}</div>{/if}
        {#each list as w (w.id)}
          {@const ok = filled(w)}
          {@const value = preview(w)}
          <button class="row" onclick={() => editor.focusField(w)}>
            <span class="icon" class:ok class:req={w.required && !ok}>
              {#if ok}<CircleCheck size={15} />{:else if w.kind === "signature"}<PenLine size={14} />{:else}<Circle size={15} />{/if}
            </span>
            <span class="label">{w.label}{#if w.required}<span class="star">*</span>{/if}</span>
            {#if value}<span class="value">{value}</span>{/if}
          </button>
        {/each}
      {/each}
    </div>

    <footer class="foot">
      <label class="switch">
        <input type="checkbox" bind:checked={editor.highlightFields} />
        <span class="track"><span class="knob"></span></span>
        Highlight
      </label>
      <button class="btn ghost danger small" onclick={() => editor.clearFields()}>
        <Eraser size={14} /> Clear
      </button>
    </footer>
  {:else}
    <div class="empty">
      <p>No form fields. Use the tools to write on the page:</p>
      <ul>
        <li><span class="kbd">T</span> Text</li>
        <li><span class="kbd">S</span> Signature</li>
        <li><span class="kbd">I</span> Initials</li>
        <li><span class="kbd">D</span> Date</li>
        <li><span class="kbd">X</span> Check <span class="kbd">C</span> Cross</li>
        <li><span class="kbd">W</span> Whiteout <span class="kbd">H</span> Highlight</li>
      </ul>
    </div>
  {/if}
</aside>

<style>
  .panel {
    flex: none;
    width: 280px;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-left: 1px solid var(--border);
    min-height: 0;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 14px 16px 0;
  }
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
  }
  .count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-2);
  }
  .count.done {
    color: var(--success);
  }

  .progress {
    padding: 10px 16px 14px;
    border-bottom: 1px solid var(--border);
  }
  .bar {
    height: 4px;
    border-radius: 2px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.25s;
  }
  .bar.done span {
    background: var(--success);
  }
  .status {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 10px 0 0;
    font-size: 12.5px;
  }
  .status.ok {
    color: var(--success);
  }
  .status.req {
    color: var(--danger);
  }
  .next {
    width: 100%;
    margin-top: 10px;
    justify-content: space-between;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 8px 12px;
  }
  .group {
    padding: 10px 8px 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius);
    background: transparent;
    text-align: left;
  }
  .row:hover {
    background: var(--surface-2);
  }
  .icon {
    flex: none;
    display: grid;
    color: var(--text-3);
  }
  .icon.ok {
    color: var(--success);
  }
  .icon.req {
    color: var(--danger);
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .star {
    margin-left: 2px;
    color: var(--danger);
  }
  .value {
    flex: none;
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--text-3);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 8px 16px;
    border-top: 1px solid var(--border);
  }
  .small {
    height: 28px;
    padding: 0 8px;
    font-size: 13px;
  }
  .switch {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
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
    width: 30px;
    height: 17px;
    border-radius: 99px;
    background: var(--surface-3);
    transition: background 0.15s;
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--text-2);
    transition: translate 0.15s, background 0.15s;
  }
  .switch input:checked + .track {
    background: var(--accent);
  }
  .switch input:checked + .track .knob {
    translate: 13px 0;
    background: var(--on-accent);
  }
  .switch input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .empty {
    padding: 12px 16px;
    font-size: 13px;
    color: var(--text-2);
  }
  .empty p {
    margin: 0 0 12px;
  }
  .empty ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .empty li {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  @media (max-width: 1100px) {
    .panel {
      width: 250px;
    }
  }
</style>
