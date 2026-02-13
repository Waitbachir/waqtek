const DISPLAY_UI_DEFAULTS = Object.freeze({
  customTitle: "",
  accentColor: "#4f46e5",
  headerBg: "rgba(15,23,42,0.55)",
  logoUrl: "",
  videoOpacity: 1,
  hideSettingsButton: false
});

function normalizeOpacity(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return DISPLAY_UI_DEFAULTS.videoOpacity;
  return Math.max(0.2, Math.min(1, num));
}

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function computeWsReconnectDelay(attempt, baseMs = 1500, maxMs = 30000) {
  const safeAttempt = Math.max(0, Number.parseInt(attempt, 10) || 0);
  const safeBase = Math.max(1, Number(baseMs) || 1500);
  const safeMax = Math.max(safeBase, Number(maxMs) || 30000);
  return Math.min(safeMax, safeBase * Math.pow(2, safeAttempt));
}

function parseDisplayUiConfig({ search = "", storedUi = {} } = {}) {
  const params = new URLSearchParams(String(search || ""));
  const ui = {
    ...DISPLAY_UI_DEFAULTS,
    ...(storedUi && typeof storedUi === "object" ? storedUi : {})
  };

  if (params.has("uiTitle")) ui.customTitle = String(params.get("uiTitle") || "").trim();
  if (params.has("uiAccent")) ui.accentColor = String(params.get("uiAccent") || "").trim() || DISPLAY_UI_DEFAULTS.accentColor;
  if (params.has("uiHeaderBg")) ui.headerBg = String(params.get("uiHeaderBg") || "").trim() || DISPLAY_UI_DEFAULTS.headerBg;
  if (params.has("uiLogo")) ui.logoUrl = String(params.get("uiLogo") || "").trim();
  if (params.has("uiVideoOpacity")) ui.videoOpacity = normalizeOpacity(params.get("uiVideoOpacity"));
  if (params.has("uiHideSettings")) ui.hideSettingsButton = parseBoolean(params.get("uiHideSettings"));

  ui.videoOpacity = normalizeOpacity(ui.videoOpacity);
  ui.hideSettingsButton = Boolean(ui.hideSettingsButton);
  return ui;
}

if (typeof window !== "undefined") {
  window.WaitingDisplayUtils = {
    computeWsReconnectDelay,
    parseDisplayUiConfig
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.WaitingDisplayUtils = globalThis.WaitingDisplayUtils || {
    computeWsReconnectDelay,
    parseDisplayUiConfig
  };
}
