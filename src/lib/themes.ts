// Color schemes. Each maps a palette onto the app's design tokens (see app.css).

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  /** Behind the pages. */
  desk: string;
  /** Toolbar and side panels. */
  surface: string;
  /** Inputs, cards, popovers. */
  surface2: string;
  /** Hover states, inset groups. */
  surface3: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  warning: string;
  marker: string;
}

export const THEMES: Theme[] = [
  {
    id: "mocha",
    name: "Catppuccin Mocha",
    dark: true,
    desk: "#11111b",
    surface: "#181825",
    surface2: "#1e1e2e",
    surface3: "#313244",
    border: "#313244",
    borderStrong: "#45475a",
    text: "#cdd6f4",
    text2: "#bac2de",
    text3: "#7f849c",
    accent: "#cba6f7",
    onAccent: "#11111b",
    danger: "#f38ba8",
    success: "#a6e3a1",
    warning: "#fab387",
    marker: "#f9e2af",
  },
  {
    id: "macchiato",
    name: "Catppuccin Macchiato",
    dark: true,
    desk: "#181926",
    surface: "#1e2030",
    surface2: "#24273a",
    surface3: "#363a4f",
    border: "#363a4f",
    borderStrong: "#494d64",
    text: "#cad3f5",
    text2: "#b8c0e0",
    text3: "#8087a2",
    accent: "#c6a0f6",
    onAccent: "#181926",
    danger: "#ed8796",
    success: "#a6da95",
    warning: "#f5a97f",
    marker: "#eed49f",
  },
  {
    id: "frappe",
    name: "Catppuccin Frappé",
    dark: true,
    desk: "#232634",
    surface: "#292c3c",
    surface2: "#303446",
    surface3: "#414559",
    border: "#414559",
    borderStrong: "#51576d",
    text: "#c6d0f5",
    text2: "#b5bfe2",
    text3: "#838ba7",
    accent: "#ca9ee6",
    onAccent: "#232634",
    danger: "#e78284",
    success: "#a6d189",
    warning: "#ef9f76",
    marker: "#e5c890",
  },
  {
    id: "latte",
    name: "Catppuccin Latte",
    dark: false,
    desk: "#dce0e8",
    surface: "#e6e9ef",
    surface2: "#eff1f5",
    surface3: "#ccd0da",
    border: "#ccd0da",
    borderStrong: "#bcc0cc",
    text: "#4c4f69",
    text2: "#5c5f77",
    text3: "#8c8fa1",
    accent: "#8839ef",
    onAccent: "#eff1f5",
    danger: "#d20f39",
    success: "#40a02b",
    warning: "#fe640b",
    marker: "#df8e1d",
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    dark: true,
    desk: "#191724",
    surface: "#1f1d2e",
    surface2: "#26233a",
    surface3: "#2f2c44",
    border: "#2a2740",
    borderStrong: "#403d52",
    text: "#e0def4",
    text2: "#c4c1dc",
    text3: "#6e6a86",
    accent: "#c4a7e7",
    onAccent: "#191724",
    danger: "#eb6f92",
    success: "#9ccfd8",
    warning: "#f6c177",
    marker: "#f6c177",
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine Dawn",
    dark: false,
    desk: "#f2e9e1",
    surface: "#fffaf3",
    surface2: "#faf4ed",
    surface3: "#f2e9e1",
    border: "#e4dcd6",
    borderStrong: "#cecacd",
    text: "#575279",
    text2: "#797593",
    text3: "#9893a5",
    accent: "#907aa9",
    onAccent: "#fffaf3",
    danger: "#b4637a",
    success: "#286983",
    warning: "#ea9d34",
    marker: "#ea9d34",
  },
  {
    id: "gruvbox",
    name: "Gruvbox Dark",
    dark: true,
    desk: "#1d2021",
    surface: "#282828",
    surface2: "#32302f",
    surface3: "#3c3836",
    border: "#3c3836",
    borderStrong: "#504945",
    text: "#ebdbb2",
    text2: "#d5c4a1",
    text3: "#928374",
    accent: "#fabd2f",
    onAccent: "#282828",
    danger: "#fb4934",
    success: "#b8bb26",
    warning: "#fe8019",
    marker: "#fabd2f",
  },
  {
    id: "nord",
    name: "Nord",
    dark: true,
    desk: "#242933",
    surface: "#2e3440",
    surface2: "#3b4252",
    surface3: "#434c5e",
    border: "#3b4252",
    borderStrong: "#4c566a",
    text: "#eceff4",
    text2: "#d8dee9",
    text3: "#8a94a7",
    accent: "#88c0d0",
    onAccent: "#2e3440",
    danger: "#bf616a",
    success: "#a3be8c",
    warning: "#d08770",
    marker: "#ebcb8b",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    dark: true,
    desk: "#16161e",
    surface: "#1a1b26",
    surface2: "#1f2335",
    surface3: "#292e42",
    border: "#292e42",
    borderStrong: "#414868",
    text: "#c0caf5",
    text2: "#a9b1d6",
    text3: "#737aa2",
    accent: "#7aa2f7",
    onAccent: "#16161e",
    danger: "#f7768e",
    success: "#9ece6a",
    warning: "#ff9e64",
    marker: "#e0af68",
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    dark: false,
    desk: "#eee8d5",
    surface: "#fdf6e3",
    surface2: "#f8f1dc",
    surface3: "#eee8d5",
    border: "#e4ddc8",
    borderStrong: "#d3cbb2",
    text: "#073642",
    text2: "#586e75",
    text3: "#93a1a1",
    accent: "#268bd2",
    onAccent: "#fdf6e3",
    danger: "#dc322f",
    success: "#859900",
    warning: "#cb4b16",
    marker: "#b58900",
  },
];

export const DEFAULT_THEME = "mocha";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--desk", theme.desk);
  set("--surface", theme.surface);
  set("--surface-2", theme.surface2);
  set("--surface-3", theme.surface3);
  set("--border", theme.border);
  set("--border-strong", theme.borderStrong);
  set("--text", theme.text);
  set("--text-2", theme.text2);
  set("--text-3", theme.text3);
  set("--accent", theme.accent);
  set("--on-accent", theme.onAccent);
  set("--danger", theme.danger);
  set("--success", theme.success);
  set("--warning", theme.warning);
  set("--marker", theme.marker);
  root.style.colorScheme = theme.dark ? "dark" : "light";
  root.dataset.dark = String(theme.dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.surface);
}
