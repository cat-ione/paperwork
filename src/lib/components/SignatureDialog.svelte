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
    { value: "#111111", label: "Black" },
    { value: "#1d3fae", label: "Blue" },
    { value: "#5b21b6", label: "Purple" },
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
        <h2 id="sig-title">Create your {noun}</h2>
        <p>{editor.signTarget ? `It will be placed in “${editor.signTarget.label}”.` : "Then click on the document to place it."}</p>
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

    <div class="body">
      <div class="pane" class:hidden={mode !== "draw"}>
        <div class="pad" class:initials={kind === "initials"}>
          <canvas bind:this={canvas} onpointerdown={onDrawDown}></canvas>
          <div class="baseline"><span>✕</span></div>
          {#if !hasInk}
            <div class="placeholder">Draw your {noun} here</div>
          {/if}
          {#if hasInk}
            <button class="clear" onclick={clearDrawing}><RotateCcw size={13} /> Clear</button>
          {/if}
        </div>
      </div>

      {#if mode === "type"}
        <div class="pane">
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="name-input"
            bind:value={typed}
            placeholder={kind === "signature" ? "Type your full name" : "Type your initials"}
            autofocus
            maxlength={kind === "signature" ? 60 : 6}
            onkeydown={(e) => e.key === "Enter" && canSubmit && submit()}
          />
          <div class="fonts">
            {#each FONTS as f (f.family)}
              <button
                class="font-card"
                class:on={font === f.family}
                onclick={() => (font = f.family)}
                style:font-family={`"${f.family}"`}
                style:font-weight={f.weight}
                style:font-size="{(kind === 'signature' ? 30 : 34) * f.scale}px"
                style:color
              >
                {typed.trim() || (kind === "signature" ? "Your Name" : "YN")}
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
              <span class="drop-title">Choose an image</span>
              <span class="drop-sub">A photo or scan of your {noun} on white paper works best</span>
            {/if}
          </button>
          <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={(e) => onFile(e.currentTarget.files?.[0])} />
          {#if uploaded}
            <label class="check">
              <input type="checkbox" bind:checked={removeBg} /> Remove white background
            </label>
          {/if}
        </div>
      {/if}

      {#if mode !== "upload"}
        <div class="colors">
          {#each COLORS as c (c.value)}
            <button class="swatch" class:on={color === c.value} style:--c={c.value} aria-label={c.label} title={c.label} onclick={() => (color = c.value)}></button>
          {/each}
        </div>
      {/if}
    </div>

    <footer>
      <label class="check">
        <input type="checkbox" bind:checked={remember} /> Save for next time
      </label>
      <div class="actions">
        <button class="btn" onclick={cancel}>Cancel</button>
        <button class="btn primary" disabled={!canSubmit} onclick={submit}>
          {editor.signTarget ? "Sign" : `Use ${noun}`}
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
    background: rgba(10, 12, 18, 0.45);
    backdrop-filter: blur(4px);
    animation: fade-in 0.15s;
  }
  .dialog {
    width: min(620px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
    animation: pop-in 0.18s ease-out;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 20px 0 24px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }
  header p {
    margin: 2px 0 0;
    color: var(--text-3);
    font-size: 13px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin: 16px 24px 0;
    padding: 4px;
    border-radius: 11px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .tabs button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-2);
    font-weight: 500;
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button.on {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm), 0 0 0 1px var(--border);
  }

  .body {
    padding: 16px 24px 4px;
  }
  .pane.hidden {
    display: none;
  }
  .pad {
    position: relative;
    height: 210px;
    border-radius: 12px;
    background: #fff;
    border: 1px solid var(--border);
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
    left: 28px;
    right: 28px;
    bottom: 54px;
    border-bottom: 1.5px dashed #cfd3dc;
  }
  .baseline span {
    position: absolute;
    left: -2px;
    bottom: 2px;
    color: #b6bbc6;
    font-size: 14px;
  }
  .placeholder {
    position: absolute;
    inset: 0 0 40px;
    display: grid;
    place-items: center;
    color: #a3a9b6;
    font-size: 15px;
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
    height: 28px;
    padding: 0 10px;
    border: 1px solid #e3e5ea;
    border-radius: 7px;
    background: #fff;
    color: #4c5361;
    font-size: 12.5px;
    font-weight: 500;
  }
  .clear:hover {
    background: #f6f7f9;
  }

  .name-input {
    width: 100%;
    height: 42px;
    padding: 0 14px;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    background: var(--surface);
    font-size: 15px;
    outline: none;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .name-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .fonts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 12px;
  }
  .font-card {
    height: 76px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.6;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .font-card:hover {
    border-color: var(--border-strong);
  }
  .font-card.on {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
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
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--text-3);
    transition: border-color 0.12s, background 0.12s;
  }
  .drop:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .drop.has {
    background: #fff
      repeating-conic-gradient(#f1f2f5 0% 25%, transparent 0% 50%) 50% / 16px 16px;
  }
  .drop img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .drop-title {
    margin-top: 4px;
    color: var(--text);
    font-weight: 600;
  }
  .drop-sub {
    font-size: 12.5px;
  }

  .colors {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 14px;
  }
  .swatch {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
  }
  .swatch::before {
    content: "";
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--c);
  }
  .swatch.on::before {
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--c);
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding: 14px 20px 14px 24px;
    background: var(--surface-2);
    border-top: 1px solid var(--border);
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
