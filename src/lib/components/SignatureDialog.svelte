<script lang="ts">
  import { onMount } from "svelte";
  import { ImageUp, PenLine, RotateCcw, Type, X } from "@lucide/svelte";
  import { editor } from "../editor.svelte";
  import { prefs } from "../storage.svelte";
  import type { SavedSignature } from "../types";

  let { kind }: { kind: "signature" | "initials" } = $props();

  type Mode = "draw" | "type" | "upload";
  let mode = $state<Mode>("draw");
  let color = $state("#111111");
  let remember = $state(true);

  const COLORS = [
    { value: "#111111", label: "Carbon" },
    { value: "#1d3fae", label: "Royal" },
    { value: "#5b21b6", label: "Violet" },
  ];
  const FONTS = [
    { family: "Dancing Script", weight: 500, scale: 1 },
    { family: "Great Vibes", weight: 400, scale: 1.15 },
    { family: "Allura", weight: 400, scale: 1.2 },
    { family: "Caveat", weight: 500, scale: 1.05 },
  ];

  const noun = $derived(kind === "signature" ? "signature" : "initials");

  // ---------------------------------------------------------------- draw ---
  let canvas = $state<HTMLCanvasElement>();
  let hasInk = $state(false);
  let strokes: { x: number; y: number; w: number }[][] = [];

  onMount(() => {
    sizeCanvas();
  });

  function sizeCanvas() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const scale = (window.devicePixelRatio || 1) * 2;
    canvas.width = Math.round(r.width * scale);
    canvas.height = Math.round(r.height * scale);
    redraw();
  }

  function redraw() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) drawStroke(ctx, s, scale);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, pts: { x: number; y: number; w: number }[], scale: number) {
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * scale, pts[0].y * scale, (pts[0].w * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Smooth the path with quadratic curves through segment midpoints.
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const prevMid = i > 1 ? mid(pts[i - 2], p0) : p0;
      const m = mid(p0, p1);
      ctx.beginPath();
      ctx.lineWidth = ((p0.w + p1.w) / 2) * scale;
      ctx.moveTo(prevMid.x * scale, prevMid.y * scale);
      ctx.quadraticCurveTo(p0.x * scale, p0.y * scale, m.x * scale, m.y * scale);
      ctx.stroke();
    }
  }

  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function onDrawDown(e: PointerEvent) {
    if (!canvas) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    const width = (x: PointerEvent) => (x.pointerType === "pen" ? 1.2 + x.pressure * 2.6 : 2.6);
    const stroke = [{ x: e.clientX - r.left, y: e.clientY - r.top, w: width(e) }];
    strokes.push(stroke);
    hasInk = true;
    redraw();

    const move = (ev: PointerEvent) => {
      const events = ev.getCoalescedEvents?.() ?? [ev];
      for (const ce of events) {
        const last = stroke[stroke.length - 1];
        const p = { x: ce.clientX - r.left, y: ce.clientY - r.top, w: width(ce) };
        // Lighter strokes when moving fast, like a real pen.
        if (ce.pointerType !== "pen") {
          const speed = Math.hypot(p.x - last.x, p.y - last.y);
          p.w = Math.max(1.6, Math.min(3, 3.2 - speed * 0.06));
          p.w = last.w * 0.7 + p.w * 0.3;
        }
        if (Math.hypot(p.x - last.x, p.y - last.y) > 0.8) stroke.push(p);
      }
      redraw();
    };
    const up = () => {
      canvas!.removeEventListener("pointermove", move);
      canvas!.removeEventListener("pointerup", up);
      canvas!.removeEventListener("pointercancel", up);
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }

  function clearDrawing() {
    strokes = [];
    hasInk = false;
    redraw();
  }

  $effect(() => {
    void color;
    redraw();
  });

  // ---------------------------------------------------------------- type ---
  const defaultName = () => {
    const name = prefs.typedName;
    if (kind === "initials") return name.split(/\s+/).filter(Boolean).map((w) => w[0]?.toUpperCase()).join("");
    return name;
  };
  let typed = $state(defaultName());
  let font = $state(FONTS[0].family);
  let nameInput = $state<HTMLInputElement>();

  // Switching to the Type tab should let you start typing straight away.
  $effect(() => {
    if (mode === "type" && nameInput) nameInput.focus();
  });

  // ---------------------------------------------------------------- upload ---
  let uploaded = $state<HTMLImageElement | null>(null);
  let removeBg = $state(true);
  let uploadPreview = $state("");
  let fileInput = $state<HTMLInputElement>();

  function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      uploaded = img;
      refreshUploadPreview();
    };
    img.src = url;
  }

  function refreshUploadPreview() {
    if (!uploaded) return;
    uploadPreview = renderUpload()?.src ?? "";
  }

  $effect(() => {
    void removeBg;
    refreshUploadPreview();
  });

  function renderUpload() {
    if (!uploaded) return null;
    const max = 1400;
    const s = Math.min(1, max / Math.max(uploaded.naturalWidth, uploaded.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(uploaded.naturalWidth * s);
    c.height = Math.round(uploaded.naturalHeight * s);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(uploaded, 0, 0, c.width, c.height);
    if (removeBg) {
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        // Fade light pixels to transparent; keep ink fully opaque.
        const alpha = lum > 215 ? 0 : lum > 150 ? (215 - lum) / 65 : 1;
        px[i + 3] = Math.round(px[i + 3] * alpha);
      }
      ctx.putImageData(data, 0, 0);
    }
    return trim(c);
  }

  // --------------------------------------------------------------- output ---
  const canSubmit = $derived(
    mode === "draw" ? hasInk : mode === "type" ? typed.trim().length > 0 : !!uploaded,
  );

  async function renderTyped() {
    const size = 160;
    const f = FONTS.find((x) => x.family === font)!;
    const spec = `${f.weight} ${size * f.scale}px "${f.family}"`;
    await document.fonts.load(spec, typed);
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = spec;
    const m = ctx.measureText(typed);
    c.width = Math.ceil(m.width + size);
    c.height = Math.ceil(size * f.scale * 1.8);
    ctx.font = spec;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(typed, size / 2, c.height / 2);
    return trim(c);
  }

  function trim(c: HTMLCanvasElement) {
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    const pad = Math.round(Math.max(width, height) * 0.01) + 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d")!.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return { src: out.toDataURL("image/png"), width: out.width, height: out.height };
  }

  async function submit() {
    let result: { src: string; width: number; height: number } | null = null;
    if (mode === "draw" && canvas) result = trim(canvas);
    else if (mode === "type") {
      result = await renderTyped();
      if (kind === "signature") prefs.setTypedName(typed.trim());
    } else if (mode === "upload") result = renderUpload();
    if (!result) return;

    const sig: SavedSignature = { id: Math.random().toString(36).slice(2, 10), kind, ...result };
    if (remember) prefs.addSignature(sig);
    editor.useSignature(sig);
  }

  function cancel() {
    editor.signatureDialog = null;
    editor.signTarget = null;
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
    }
  }}
  onresize={sizeCanvas}
/>

<div class="backdrop" onpointerdown={(e) => e.target === e.currentTarget && cancel()} role="presentation">
  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="sig-title">
    <header>
      <div>
        <span class="mono-label">Specimen {noun}</span>
        <h2 id="sig-title" class="display">{kind === "signature" ? "Your signature, please." : "Your initials, please."}</h2>
        <p>{editor.signTarget ? `It goes on “${editor.signTarget.label}”.` : "Afterwards, click on the document to place it."}</p>
      </div>
      <button class="icon-btn" aria-label="Close" onclick={cancel}><X size={18} /></button>
    </header>

    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={mode === "draw"} class:on={mode === "draw"} onclick={() => (mode = "draw")}>
        <PenLine size={15} /> Draw
      </button>
      <button role="tab" aria-selected={mode === "type"} class:on={mode === "type"} onclick={() => (mode = "type")}>
        <Type size={15} /> Type
      </button>
      <button role="tab" aria-selected={mode === "upload"} class:on={mode === "upload"} onclick={() => (mode = "upload")}>
        <ImageUp size={15} /> Upload
      </button>
    </div>

    <div class="card">
      <div class="pane" class:hidden={mode !== "draw"}>
        <div class="pad" class:initials={kind === "initials"}>
          <canvas bind:this={canvas} onpointerdown={onDrawDown}></canvas>
          <div class="baseline"><span class="x">✕</span><span class="line-label mono-label">Signature of party</span></div>
          {#if !hasInk}
            <div class="placeholder">sign above the line</div>
          {/if}
          {#if hasInk}
            <button class="clear" onclick={clearDrawing}><RotateCcw size={13} /> Start over</button>
          {/if}
        </div>
      </div>

      {#if mode === "type"}
        <div class="pane">
          <input
            bind:this={nameInput}
            class="name-input"
            bind:value={typed}
            placeholder={kind === "signature" ? "Type your full name" : "Type your initials"}
            maxlength={kind === "signature" ? 60 : 6}
            onkeydown={(e) => e.key === "Enter" && canSubmit && submit()}
          />
          <div class="fonts" role="radiogroup" aria-label="Handwriting style">
            {#each FONTS as f, i (f.family)}
              <button
                class="font-card"
                class:on={font === f.family}
                role="radio"
                aria-checked={font === f.family}
                onclick={() => (font = f.family)}
              >
                <span class="font-no mono-label">{String.fromCharCode(65 + i)}</span>
                <span
                  class="font-sample"
                  style:font-family={`"${f.family}"`}
                  style:font-weight={f.weight}
                  style:font-size="{(kind === 'signature' ? 30 : 34) * f.scale}px"
                  style:color
                >
                  {typed.trim() || (kind === "signature" ? "Your Name" : "YN")}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {:else if mode === "upload"}
        <div class="pane">
          <button
            class="drop"
            class:has={!!uploadPreview}
            onclick={() => fileInput?.click()}
            ondragover={(e) => e.preventDefault()}
            ondrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer?.files[0]);
            }}
          >
            {#if uploadPreview}
              <img src={uploadPreview} alt="Uploaded {noun}" />
            {:else}
              <ImageUp size={26} strokeWidth={1.6} />
              <span class="drop-title display">Choose a photo or scan</span>
              <span class="drop-sub">Dark ink on white paper works best</span>
            {/if}
          </button>
          <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={(e) => onFile(e.currentTarget.files?.[0])} />
          {#if uploaded}
            <label class="check">
              <input type="checkbox" bind:checked={removeBg} /> Remove the white paper behind it
            </label>
          {/if}
        </div>
      {/if}

      {#if mode !== "upload"}
        <div class="inks" role="radiogroup" aria-label="Ink colour">
          {#each COLORS as c (c.value)}
            <button class="ink" class:on={color === c.value} style:--c={c.value} role="radio" aria-checked={color === c.value} onclick={() => (color = c.value)}>
              <span class="pot"></span>
              <span class="ink-name mono-label">{c.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <footer>
      <label class="check">
        <input type="checkbox" bind:checked={remember} /> Keep on file for next time
      </label>
      <div class="actions">
        <button class="btn" onclick={cancel}>Cancel</button>
        <button class="btn primary" disabled={!canSubmit} onclick={submit}>
          {editor.signTarget ? "Sign it" : `Use ${noun}`}
        </button>
      </div>
    </footer>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(28, 20, 8, 0.45);
    backdrop-filter: blur(3px) sepia(0.3);
    animation: fade-in 0.15s;
  }
  .dialog {
    width: min(620px, 100%);
    background: var(--surface) var(--grain);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    box-shadow: var(--shadow-lg);
    animation: dialog-in 0.22s cubic-bezier(0.3, 1.2, 0.5, 1);
    overflow: hidden;
  }
  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translateY(12px) rotate(-1deg);
    }
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 22px 20px 0 26px;
  }
  h2 {
    margin: 4px 0 0;
    font-size: 26px;
    font-weight: 480;
    font-style: italic;
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 72;
    letter-spacing: -0.02em;
  }
  header p {
    margin: 4px 0 0;
    color: var(--text-3);
    font-size: 13px;
  }

  /* Index-card tabs that sit on top of the card below. */
  .tabs {
    display: flex;
    gap: 4px;
    margin: 18px 26px 0;
    position: relative;
    z-index: 1;
  }
  .tabs button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 16px;
    margin-bottom: -1px;
    border: 1px solid var(--border-strong);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--surface-3);
    color: var(--text-3);
    font-weight: 600;
    transition: color 0.12s, background 0.12s;
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button.on {
    background: var(--surface-2);
    color: var(--text);
    height: 38px;
    margin-top: -4px;
  }
  .card {
    margin: 0 26px;
    padding: 16px;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: 0 6px 6px 6px;
  }
  .pane.hidden {
    display: none;
  }

  .pad {
    position: relative;
    height: 210px;
    border-radius: 2px;
    background: #fffdf7;
    box-shadow: 0 1px 2px rgba(60, 40, 10, 0.18);
    overflow: hidden;
  }
  .pad.initials {
    width: 340px;
    margin: 0 auto;
  }
  .pad canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
    z-index: 1;
  }
  .baseline {
    position: absolute;
    left: 30px;
    right: 30px;
    bottom: 52px;
    border-bottom: 1.5px solid #3a3326;
  }
  .baseline .x {
    position: absolute;
    left: -4px;
    bottom: 3px;
    font-family: var(--font-display);
    font-size: 20px;
    color: #b8321f;
  }
  .line-label {
    position: absolute;
    top: 6px;
    left: 0;
    color: #a2977f;
  }
  .placeholder {
    position: absolute;
    inset: 0 0 46px;
    display: grid;
    place-items: center;
    font-family: var(--font-hand);
    font-size: 26px;
    color: #c2b7a0;
    pointer-events: none;
  }
  .clear {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 10px;
    border: 1px solid #ddd3be;
    border-radius: 3px;
    background: #fbf8f1;
    color: #5e574b;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .clear:hover {
    background: #f4efe3;
  }

  .name-input {
    width: 100%;
    height: 44px;
    padding: 0 2px;
    border: none;
    border-bottom: 1.5px solid var(--text-2);
    border-radius: 0;
    background: transparent;
    font-family: var(--font-display);
    font-size: 20px;
    font-variation-settings: "SOFT" 100;
    outline: none;
  }
  .name-input:focus {
    border-bottom-color: var(--accent);
  }
  .fonts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 14px;
  }
  .font-card {
    position: relative;
    display: grid;
    place-items: center;
    height: 78px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: #fffdf7;
    box-shadow: 0 1px 2px rgba(60, 40, 10, 0.15);
    overflow: hidden;
    transition: box-shadow 0.12s, transform 0.12s;
  }
  .font-card:hover {
    transform: translateY(-1px) rotate(-0.5deg);
  }
  .font-card.on {
    box-shadow: 0 0 0 2px var(--accent), 0 4px 10px -4px rgba(60, 40, 10, 0.4);
  }
  .font-no {
    position: absolute;
    top: 5px;
    left: 7px;
    color: #a2977f;
  }
  .font-sample {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.6;
  }

  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 210px;
    padding: 16px;
    border: 1.5px dashed var(--border-strong);
    border-radius: 2px;
    background: #fffdf7;
    color: #958b79;
    transition: border-color 0.12s;
  }
  .drop:hover {
    border-color: var(--accent);
  }
  .drop.has {
    background: #fff repeating-conic-gradient(#f1ece0 0% 25%, transparent 0% 50%) 50% / 16px 16px;
  }
  .drop img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .drop-title {
    margin-top: 4px;
    color: #221f1a;
    font-size: 18px;
    font-variation-settings: "SOFT" 100, "WONK" 1;
  }
  .drop-sub {
    font-size: 12.5px;
  }

  /* Ink pots */
  .inks {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 14px;
  }
  .ink {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
  }
  .pot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 40%, white) 0 12%, var(--c) 45%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: transform 0.12s;
  }
  .ink:hover .pot {
    transform: scale(1.1);
  }
  .ink.on .pot {
    box-shadow: 0 0 0 2px var(--surface-2), 0 0 0 4px var(--c);
  }
  .ink.on .ink-name {
    color: var(--text);
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 18px 26px;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    color: var(--text-2);
    font-size: 13px;
    cursor: pointer;
  }
  footer .check {
    margin-top: 0;
  }
  .check input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--accent);
  }
</style>
