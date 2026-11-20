<script lang="ts">
  import { onMount } from "svelte";
  import { PenLine } from "@lucide/svelte";
  import { editor, isFilled } from "../editor.svelte";
  import type { FieldWidget } from "../types";

  let { widget: w }: { widget: FieldWidget } = $props();

  let el = $state<HTMLElement>();
  const z = $derived(editor.zoom);
  const value = $derived(editor.values[w.name]);
  const empty = $derived(!isFilled(value));

  onMount(() => {
    if (el) editor.fieldEls.set(w.id, el);
    return () => {
      if (editor.fieldEls.get(w.id) === el) editor.fieldEls.delete(w.id);
    };
  });

  /** Font size in points: the field's own size, or an "auto" size that fits the box. */
  const fontSize = $derived.by(() => {
    if (w.fontSize > 0) return w.fontSize;
    if (w.multiline) return Math.min(11, Math.max(7, w.h * 0.3));
    return Math.min(12, Math.max(6, (w.h - 2) * 0.68));
  });

  // Comb fields spread characters evenly across fixed cells.
  const combCell = $derived(w.comb && w.maxLen > 0 ? w.w / w.maxLen : 0);

  const box = $derived(
    `left:${w.x * z}px;top:${w.y * z}px;width:${w.w * z}px;height:${w.h * z}px;`,
  );
  const textStyle = $derived(
    combCell
      ? `font-size:${fontSize * z}px;letter-spacing:${(combCell - fontSize * 0.6) * z}px;padding-left:${((combCell - fontSize * 0.6) / 2) * z}px;`
      : `font-size:${fontSize * z}px;padding:0 ${2 * z}px;text-align:${w.align};`,
  );

  function onText(e: Event) {
    editor.setValue(w.name, (e.currentTarget as HTMLInputElement).value, false);
  }
</script>

{#if w.kind === "text"}
  {#if w.multiline}
    <textarea
      bind:this={el}
      class="field text multiline"
      class:empty
      class:required={w.required}
      style="{box}{textStyle}padding-top:{1.5 * z}px;"
      value={value as string}
      oninput={onText}
      onchange={() => editor.checkpoint()}
      disabled={w.readOnly}
      maxlength={w.maxLen || undefined}
      title={w.label}
      aria-label={w.label}
      spellcheck="false"
    ></textarea>
  {:else}
    <input
      bind:this={el}
      class="field text"
      class:empty
      class:required={w.required}
      class:comb={combCell > 0}
      style="{box}{textStyle}"
      type={w.password ? "password" : "text"}
      value={value as string}
      oninput={onText}
      onchange={() => editor.checkpoint()}
      disabled={w.readOnly}
      maxlength={w.maxLen || undefined}
      title={w.label}
      aria-label={w.label}
      spellcheck="false"
      autocomplete="off"
    />
  {/if}
{:else if w.kind === "checkbox" || w.kind === "radio"}
  {@const on = value === w.exportValue}
  {@const size = Math.min(w.w, w.h) * z}
  <button
    bind:this={el}
    class="field toggle {w.kind}"
    class:on
    class:required={w.required && empty}
    style={box}
    role={w.kind}
    aria-checked={on}
    aria-label={w.label}
    title={w.label}
    disabled={w.readOnly}
    onclick={() => editor.setValue(w.name, on && w.kind === "checkbox" ? "" : w.exportValue)}
  >
    {#if on}
      {#if w.kind === "checkbox"}
        <svg viewBox="0 0 24 24" width={size * 0.82} height={size * 0.82}>
          <path d="M4.5 12.75l5 5 10-11" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {:else}
        <span class="dot" style:width="{size * 0.5}px" style:height="{size * 0.5}px"></span>
      {/if}
    {/if}
  </button>
{:else if w.kind === "select"}
  <select
    bind:this={el}
    class="field select"
    class:empty
    class:required={w.required}
    style="{box}font-size:{fontSize * z}px;"
    value={value as string}
    onchange={(e) => editor.setValue(w.name, e.currentTarget.value)}
    disabled={w.readOnly}
    title={w.label}
    aria-label={w.label}
  >
    <option value="">—</option>
    {#each w.options as o (o.value)}
      <option value={o.value}>{o.label}</option>
    {/each}
  </select>
{:else if w.kind === "list"}
  <select
    bind:this={el}
    class="field list"
    class:empty
    class:required={w.required}
    style="{box}font-size:{fontSize * z}px;"
    multiple={w.multiSelect}
    size={Math.max(2, Math.floor(w.h / (fontSize * 1.25)))}
    onchange={(e) =>
      editor.setValue(
        w.name,
        [...e.currentTarget.selectedOptions].map((o) => o.value),
      )}
    disabled={w.readOnly}
    title={w.label}
    aria-label={w.label}
  >
    {#each w.options as o (o.value)}
      <option value={o.value} selected={(value as string[] | undefined)?.includes(o.value)}>{o.label}</option>
    {/each}
  </select>
{:else if w.kind === "signature"}
  <button
    bind:this={el}
    class="field sign"
    style="{box}font-size:{Math.min(18, w.h * 0.5) * z}px;"
    onclick={() => editor.startSigning(w)}
    title="Click to sign"
  >
    <span class="x">✕</span>
    <span class="sign-text">Sign here</span>
    <PenLine size={Math.min(15, w.h * 0.42) * z} />
  </button>
{/if}

<style>
  /* Fields look like the blanks on a paper form: a faint ink wash and a pen-stroke underline. */
  .field {
    position: absolute;
    margin: 0;
    border: none;
    border-radius: 1px;
    background: transparent;
    color: #111;
    font-family: Arimo, Helvetica, Arial, sans-serif;
    line-height: 1.15;
    outline: none;
    transition: background 0.12s, box-shadow 0.12s;
  }
  :global(.highlight) > .field {
    background-color: rgba(35, 64, 142, 0.06);
    box-shadow: inset 0 -1.5px 0 rgba(35, 64, 142, 0.5);
  }
  :global(.highlight) > .field.toggle {
    box-shadow: inset 0 0 0 1.25px rgba(35, 64, 142, 0.5);
  }
  /* Required and still blank: a notary-red corner flag. */
  :global(.highlight) > .field.required.empty,
  :global(.highlight) > .field.toggle.required {
    background-image: linear-gradient(135deg, #b8321f 0 5px, transparent 5px);
    box-shadow: inset 0 -1.5px 0 rgba(184, 50, 31, 0.65);
    background-color: rgba(184, 50, 31, 0.05);
  }
  :global(.highlight) > .field.toggle.required {
    box-shadow: inset 0 0 0 1.25px rgba(184, 50, 31, 0.65);
  }
  .field:hover:not(:disabled) {
    background-color: rgba(35, 64, 142, 0.12);
  }
  .field:focus,
  .field:focus-visible {
    background-color: #fffdf6 !important;
    background-image: none !important;
    box-shadow:
      inset 0 -2px 0 #23408e,
      0 0 0 1px rgba(35, 64, 142, 0.35),
      0 0 0 4px rgba(243, 212, 74, 0.45) !important;
    outline: none;
    z-index: 2;
  }
  .field:disabled {
    background: transparent !important;
    box-shadow: none !important;
    cursor: default;
  }
  .text {
    padding: 0;
    resize: none;
    overflow: hidden;
  }
  .multiline {
    overflow: auto;
    scrollbar-width: thin;
  }
  .comb {
    font-family: Cousine, "Courier New", monospace;
  }
  .toggle {
    display: grid;
    place-items: center;
    padding: 0;
  }
  .radio {
    border-radius: 50%;
  }
  .dot {
    border-radius: 50%;
    background: #111;
  }
  .select,
  .list {
    padding: 0 2px;
    cursor: pointer;
  }
  .list option {
    padding: 0 2px;
  }

  /* Signature fields: a red "sign here" flag like the sticky tabs on a contract. */
  .sign {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.4em;
    padding: 0 0.5em;
    background: rgba(184, 50, 31, 0.07) !important;
    background-image: none !important;
    box-shadow: inset 0 -1.5px 0 rgba(184, 50, 31, 0.7) !important;
    color: #b8321f;
    overflow: hidden;
    white-space: nowrap;
  }
  .sign:hover {
    background: rgba(184, 50, 31, 0.14) !important;
  }
  .sign .x {
    font-family: var(--font-display);
    font-weight: 600;
  }
  .sign .sign-text {
    flex: 1;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
</style>
