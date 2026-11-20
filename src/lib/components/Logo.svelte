<script lang="ts">
  let { size = 28 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
  <rect x="48" y="48" width="928" height="928" rx="200" fill="#1e1e2e" />
  <path d="M312 200h320l140 140v460a32 32 0 0 1-32 32H312a32 32 0 0 1-32-32V232a32 32 0 0 1 32-32z" fill="#cdd6f4" />
  <path d="M632 200v108a32 32 0 0 0 32 32h108z" fill="#9399b2" />
  <rect x="352" y="420" width="320" height="26" rx="13" fill="#9399b2" />
  <rect x="352" y="500" width="240" height="26" rx="13" fill="#9399b2" />
  <path
    d="M356 700c30-46 56-70 72-54s-26 56 2 46 42-56 68-40 8 40 36 32 40-34 84-34"
    fill="none"
    stroke="#8839ef"
    stroke-width="30"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
