<script lang="ts">
  import { onMount } from "svelte";
  import { editor } from "../editor.svelte";
  import type { PageInfo } from "../types";

  let { page }: { page: PageInfo } = $props();

  const WIDTH = 128;
  let canvas: HTMLCanvasElement;
  const height = $derived((page.height / page.width) * WIDTH);

  onMount(() => {
    let cancelled = false;
    let task: { cancel(): void } | null = null;
    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || !editor.doc) return;
      io.disconnect();
      const p = await editor.doc.getPage(page.index + 1);
      if (cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: (WIDTH / page.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const t = p.render({ canvas, viewport });
      task = t;
      t.promise.catch(() => {});
    });
    io.observe(canvas);
    return () => {
      cancelled = true;
      io.disconnect();
      task?.cancel();
    };
  });
</script>

<canvas class="thumb-canvas" bind:this={canvas} style:width="{WIDTH}px" style:height="{height}px"></canvas>

<style>
  canvas {
    display: block;
    background: #fff;
    border-radius: 1px;
  }
</style>
