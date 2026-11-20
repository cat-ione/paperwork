import { mount } from "svelte";
// Interface type: Instrument Sans (UI) and IBM Plex Mono (labels, numbers).
import "@fontsource-variable/instrument-sans/standard.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
// Metric-compatible stand-ins for Helvetica / Times / Courier, so placed text matches the export.
import "@fontsource/arimo/400.css";
import "@fontsource/tinos/400.css";
import "@fontsource/cousine/400.css";
// Handwriting fonts for typed signatures.
import "@fontsource/dancing-script/500.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/allura/400.css";
import "@fontsource/caveat/500.css";
import "./app.css";
import App from "./App.svelte";
import { prefs } from "./lib/storage.svelte";
import { applyTheme, getTheme } from "./lib/themes";

// Apply the saved color scheme before the first render so there's no flash.
applyTheme(getTheme(prefs.theme));

const app = mount(App, { target: document.getElementById("app")! });

export default app;
