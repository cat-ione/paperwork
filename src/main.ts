import { mount } from "svelte";
import "@fontsource-variable/inter";
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

const app = mount(App, { target: document.getElementById("app")! });

export default app;
