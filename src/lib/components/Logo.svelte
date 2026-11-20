<script lang="ts">
  let { size = 28 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
  <rect x="48" y="48" width="928" height="928" rx="196" fill="#23408e" />
  <g transform="rotate(-6 512 520)">
    <path d="M300 214h330l130 130v466a26 26 0 0 1-26 26H300a26 26 0 0 1-26-26V240a26 26 0 0 1 26-26z" fill="#fbf8f1" />
    <path d="M630 214v104a26 26 0 0 0 26 26h104z" fill="#ddd3be" />
    <rect x="336" y="408" width="340" height="18" rx="9" fill="#c7baa0" />
    <rect x="336" y="466" width="300" height="18" rx="9" fill="#c7baa0" />
    <rect x="336" y="524" width="220" height="18" rx="9" fill="#c7baa0" />
    <path
      d="M340 700c26-40 48-60 62-46s-22 48 2 40 36-48 58-34 6 34 30 28"
      fill="none"
      stroke="#23408e"
      stroke-width="16"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
  <g transform="translate(700 716)">
    <path
      d="M0-150 23-131 52-140 64-112 94-106 93-76 117-58 103-31 112 0 103 31 117 58 93 76 94 106 64 112 52 140 23 131 0 150-23 131-52 140-64 112-94 106-93 76-117 58-103 31-112 0-103-31-117-58-93-76-94-106-64-112-52-140-23-131z"
      fill="#b8321f"
    />
    <circle r="92" fill="none" stroke="#f5e0d8" stroke-width="10" opacity=".55" />
    <path d="M-44 2 -12 34 50-34" fill="none" stroke="#fbf8f1" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
