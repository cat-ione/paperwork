<script lang="ts">
  import { Check, Palette } from "@lucide/svelte";
  import { prefs } from "../storage.svelte";
  import { THEMES } from "../themes";

  let open = $state(false);

  const groups = [
    { label: "Dark", themes: THEMES.filter((t) => t.dark) },
    { label: "Light", themes: THEMES.filter((t) => !t.dark) },
  ];
</script>

<svelte:window onpointerdown={() => (open = false)} />

<div class="wrap" onpointerdown={(e) => e.stopPropagation()} role="presentation">
  <button class="icon-btn" class:active={open} data-tip={open ? undefined : "Color scheme"} aria-label="Color scheme" aria-expanded={open} onclick={() => (open = !open)}>
    <Palette size={18} />
  </button>
  {#if open}
    <div class="popover menu" role="listbox" aria-label="Color scheme">
      {#each groups as g (g.label)}
        <div class="group mono-label">{g.label}</div>
        {#each g.themes as t (t.id)}
          <button
            class="row"
            class:on={prefs.theme === t.id}
            role="option"
            aria-selected={prefs.theme === t.id}
            onclick={() => prefs.setTheme(t.id)}
          >
            <span class="swatches" style:background={t.surface2} style:border-color={t.borderStrong}>
              {#each [t.accent, t.danger, t.success, t.marker] as c, i (i)}
                <span class="dot" style:background={c}></span>
              {/each}
            </span>
            <span class="name">{t.name}</span>
            {#if prefs.theme === t.id}<Check size={15} />{/if}
          </button>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap {
    position: relative;
  }
  .menu {
    top: calc(100% + 8px);
    right: 0;
    width: 260px;
  }
  .group {
    padding: 8px 8px 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--text);
    text-align: left;
  }
  .row:hover {
    background: var(--surface-3);
  }
  .row.on {
    color: var(--accent);
  }
  .swatches {
    display: flex;
    gap: 3px;
    padding: 4px 5px;
    border: 1px solid;
    border-radius: 5px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .name {
    flex: 1;
  }
</style>
