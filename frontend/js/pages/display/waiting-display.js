const STORAGE_KEY = "waqtek_display_settings";
const WAITING_CACHE_PREFIX = "waqtek_waiting_cache_";
const QR_BASE_URL = window.location.origin + window.location.pathname.replace(/queue-display\.html$/, "") + "ticket-management.html";
const WS_MONITOR_INTERVAL_MS = 5000;
const REFRESH_FALLBACK_TIMEOUT_MS = 9000;
const WS_ACTIVITY_TIMEOUT_MS = 20000;
const VIDEO_SERVICE_SCRIPT_PATH = "./js/services/VideoService.js";
let videoServiceLoaderPromise = null;

const displayUtils = window.WaitingDisplayUtils || {};
const computeReconnectDelay = typeof displayUtils.computeWsReconnectDelay === "function"
  ? displayUtils.computeWsReconnectDelay
  : (attempt, baseMs = 1500, maxMs = 30000) => Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
const resolveDisplayUiConfig = typeof displayUtils.parseDisplayUiConfig === "function"
  ? displayUtils.parseDisplayUiConfig
  : ({ storedUi = {} }) => ({
      customTitle: String(storedUi.customTitle || ""),
      accentColor: String(storedUi.accentColor || "#4f46e5"),
      headerBg: String(storedUi.headerBg || "rgba(15,23,42,0.55)"),
      logoUrl: String(storedUi.logoUrl || ""),
      videoOpacity: Number.isFinite(Number(storedUi.videoOpacity)) ? Number(storedUi.videoOpacity) : 1,
      hideSettingsButton: Boolean(storedUi.hideSettingsButton)
    });

const state = {
  establishments: [],
  queues: [],
  savedVideos: [],
  selectedEst: null,
  selectedQueue: null,
  allQueuesMode: false,
  realtimeUnsubs: [],
  lastCalledIds: new Set(),
  connectionLost: false,
  popupQueue: [],
  popupActive: false,
  adVideoName: "",
  adVideoUrl: "",
  audioEnabled: false,
  refreshInFlight: false,
  wsReconnectAttempt: 0,
  wsReconnectTimer: null,
  wsMonitorTimer: null,
  lastRealtimeActivityAt: Date.now(),
  ui: {
    customTitle: "",
    accentColor: "#4f46e5",
    headerBg: "rgba(15,23,42,0.55)",
    logoUrl: "",
    videoOpacity: 1,
    hideSettingsButton: false
  }
};

const QUEUE_PALETTE = [
  {
    panel: "bg-emerald-500/25 border-emerald-300/50",
    chip: "bg-emerald-950/45 border-emerald-300/35",
    popup: "bg-emerald-500/55 border-emerald-100/70"
  },
  {
    panel: "bg-sky-500/25 border-sky-300/50",
    chip: "bg-sky-950/45 border-sky-300/35",
    popup: "bg-sky-500/55 border-sky-100/70"
  },
  {
    panel: "bg-amber-500/25 border-amber-300/50",
    chip: "bg-amber-950/45 border-amber-300/35",
    popup: "bg-amber-500/55 border-amber-100/70"
  },
  {
    panel: "bg-fuchsia-500/25 border-fuchsia-300/50",
    chip: "bg-fuchsia-950/45 border-fuchsia-300/35",
    popup: "bg-fuchsia-500/55 border-fuchsia-100/70"
  },
  {
    panel: "bg-rose-500/25 border-rose-300/50",
    chip: "bg-rose-950/45 border-rose-300/35",
    popup: "bg-rose-500/55 border-rose-100/70"
  },
  {
    panel: "bg-indigo-500/25 border-indigo-300/50",
    chip: "bg-indigo-950/45 border-indigo-300/35",
    popup: "bg-indigo-500/55 border-indigo-100/70"
  }
];

function getQueuePalette(queueName) {
  const name = String(queueName || "-");
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % QUEUE_PALETTE.length;
  }
  return QUEUE_PALETTE[hash];
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function cacheKey(queueId) {
  return `${WAITING_CACHE_PREFIX}${queueId}`;
}

function readCachedTickets(queueId) {
  if (!queueId) return [];
  try {
    const raw = localStorage.getItem(cacheKey(queueId));
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeCachedTickets(queueId, tickets) {
  if (!queueId) return;
  try {
    const list = Array.isArray(tickets) ? tickets : [];
    localStorage.setItem(cacheKey(queueId), JSON.stringify(list.slice(0, 60)));
  } catch (_) {}
}

function isOfflineError(error) {
  if (!error) return false;
  if (!navigator.onLine) return true;
  if (!error.status) return true;
  const message = String(error.message || "").toLowerCase();
  return message.includes("network") || message.includes("fetch") || message.includes("timeout");
}

function setConnectionStatus(isLost) {
  state.connectionLost = !!isLost;
  const el = document.getElementById("connectionStatus");
  if (!el) return;
  if (state.connectionLost) {
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

function touchRealtimeActivity() {
  state.lastRealtimeActivityAt = Date.now();
}

function scheduleWsReconnect(reason = "unknown") {
  if (state.wsReconnectTimer) return;

  const delay = computeReconnectDelay(state.wsReconnectAttempt);
  state.wsReconnectAttempt += 1;

  state.wsReconnectTimer = setTimeout(() => {
    state.wsReconnectTimer = null;

    try {
      if (window.ws && typeof window.ws.disconnect === "function") {
        window.ws.disconnect();
      }
    } catch (_) {}

    RealtimeService.connectWebSocket();
  }, delay);

  console.warn("[DISPLAY] WS reconnect scheduled:", reason, "in " + delay + "ms");
}

function startWsMonitor() {
  if (state.wsMonitorTimer) {
    clearInterval(state.wsMonitorTimer);
  }

  state.wsMonitorTimer = setInterval(() => {
    if (!navigator.onLine) return;

    const isConnected = RealtimeService.isConnected();
    const staleMs = Date.now() - state.lastRealtimeActivityAt;

    if (!isConnected || staleMs > WS_ACTIVITY_TIMEOUT_MS) {
      setConnectionStatus(true);
      scheduleWsReconnect(!isConnected ? "disconnected" : "stale_activity");
      refreshQueue().catch(() => {});
    }
  }, WS_MONITOR_INTERVAL_MS);
}

function applyUiSettings() {
  const root = document.documentElement;
  const accent = state.ui.accentColor || "#4f46e5";
  const headerBg = state.ui.headerBg || "rgba(15,23,42,0.55)";
  const videoOpacity = Number.isFinite(Number(state.ui.videoOpacity)) ? Number(state.ui.videoOpacity) : 1;

  root.style.setProperty("--display-accent", accent);
  root.style.setProperty("--display-header-bg", headerBg);
  root.style.setProperty("--display-video-opacity", String(Math.max(0.2, Math.min(1, videoOpacity))));

  const logoEl = document.getElementById("brandLogo");
  if (logoEl) {
    if (state.ui.logoUrl) {
      logoEl.src = state.ui.logoUrl;
      logoEl.classList.remove("hidden");
    } else {
      logoEl.removeAttribute("src");
      logoEl.classList.add("hidden");
    }
  }

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.classList.toggle("hidden", !!state.ui.hideSettingsButton);
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.selectedEst = data.establishmentId || null;
    state.selectedQueue = data.queueId || null;
    state.allQueuesMode = Boolean(data.allQueues);
    state.adVideoName = String(data.adVideoName || "").trim();
    state.adVideoUrl = String(data.adVideoUrl || "").trim();
    state.ui = {
      ...state.ui,
      ...resolveDisplayUiConfig({ storedUi: data.ui || {} })
    };
  } catch (_) {
    console.warn("No display settings");
  }
}

function loadSettingsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const estId = params.get("establishmentId");
  const queueId = params.get("queueId");
  const allQueues = params.get("allQueues");

  if (estId) state.selectedEst = estId;
  if (queueId) state.selectedQueue = queueId;
  if (allQueues === "1" || String(allQueues).toLowerCase() === "true") {
    state.allQueuesMode = true;
  }

  state.ui = {
    ...state.ui,
    ...resolveDisplayUiConfig({ search: window.location.search, storedUi: state.ui })
  };
}

function saveSettings() {
  const payload = {
    establishmentId: state.selectedEst,
    queueId: state.selectedQueue,
    allQueues: state.allQueuesMode,
    adVideoName: state.adVideoName,
    adVideoUrl: state.adVideoUrl,
    ui: { ...state.ui }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function extractYouTubeVideoId(url) {
  const input = String(url || "").trim();
  if (!input) return "";
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIndex = parts.findIndex((p) => p === "embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
      const shortsIndex = parts.findIndex((p) => p === "shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
      return "";
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace("/", "").trim();
      return id;
    }
    return "";
  } catch (_) {
    return "";
  }
}

function requestAdFullscreen() {
  const el = document.getElementById("adFrame");
  if (!el) return;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (typeof fn === "function") {
    try {
      fn.call(el);
    } catch (_) {}
  }
}

function applyAdVideoSource(options = {}) {
  const { requestFullscreen = false } = options;
  const videoEl = document.getElementById("adVideo");
  const iframeEl = document.getElementById("adIframe");
  if (!videoEl || !iframeEl) return;

  const source = String(state.adVideoUrl || "").trim();
  const ytId = extractYouTubeVideoId(source);

  if (!source) {
    videoEl.removeAttribute("src");
    videoEl.load();
    iframeEl.removeAttribute("src");
    iframeEl.classList.add("hidden");
    videoEl.classList.remove("hidden");
    return;
  }

  if (ytId) {
    const ytSrc = `https://www.youtube.com/embed/${encodeURIComponent(ytId)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(ytId)}&controls=1&rel=0&modestbranding=1&playsinline=1`;
    if (iframeEl.getAttribute("data-current-src") !== ytSrc) {
      iframeEl.setAttribute("data-current-src", ytSrc);
      iframeEl.src = ytSrc;
    }

    videoEl.pause();
    videoEl.removeAttribute("src");
    videoEl.load();

    videoEl.classList.add("hidden");
    iframeEl.classList.remove("hidden");

    if (requestFullscreen) {
      requestAdFullscreen();
    }
    return;
  }

  if (videoEl.getAttribute("data-current-src") !== source) {
    videoEl.setAttribute("data-current-src", source);
    videoEl.src = source;
    videoEl.load();
  }

  iframeEl.removeAttribute("src");
  iframeEl.classList.add("hidden");
  videoEl.classList.remove("hidden");
  videoEl.play().catch(() => {});

  if (requestFullscreen) {
    requestAdFullscreen();
  }
}

async function ensureVideoServiceLoaded() {
  if (window.VideoService) return window.VideoService;

  if (videoServiceLoaderPromise) {
    await videoServiceLoaderPromise;
    return window.VideoService;
  }

  if (typeof window.loadScript !== "function") {
    throw new Error("Lazy loader unavailable: loadScript is not defined");
  }

  videoServiceLoaderPromise = window.loadScript(VIDEO_SERVICE_SCRIPT_PATH);
  await videoServiceLoaderPromise;

  if (!window.VideoService) {
    throw new Error("VideoService failed to initialize");
  }

  return window.VideoService;
}

async function loadSavedVideosForEst(estId) {
  const select = document.getElementById("savedVideoSelect");
  if (!select) return;

  if (!estId) {
    state.savedVideos = [];
    select.disabled = true;
    select.innerHTML = '<option value="">Selectionner...</option>';
    return;
  }

  try {
    const videoService = await ensureVideoServiceLoaded();
    const videos = await videoService.getVideosByEstablishment(estId);
    state.savedVideos = Array.isArray(videos) ? videos : [];
  } catch (error) {
    console.error("[DISPLAY] Load videos error:", error);
    state.savedVideos = [];
  }

  select.disabled = state.savedVideos.length === 0;
  select.innerHTML = '<option value="">Selectionner...</option>' + state.savedVideos.map((v) => {
    const name = v.nom || v.name || `Video ${v.id || ""}`;
    const id = v.id || "";
    return `<option value="${escapeHtml(String(id))}">${escapeHtml(name)}</option>`;
  }).join("");

  if (state.adVideoUrl) {
    const selected = state.savedVideos.find((v) => String(v.lien || v.url || "").trim() === state.adVideoUrl);
    if (selected?.id) {
      select.value = String(selected.id);
    }
  }
}

function buildQrLink() {
  const params = new URLSearchParams();
  if (state.selectedQueue) params.set("queueId", state.selectedQueue);
  if (state.selectedEst) params.set("establishmentId", state.selectedEst);
  if (state.allQueuesMode) params.set("allQueues", "1");
  return `${QR_BASE_URL}?${params.toString()}`;
}

function renderQr() {
  const qrCanvas = document.getElementById("qrCanvas");
  if (!qrCanvas) return;
  new QRious({ element: qrCanvas, size: 120, value: buildQrLink() });
}

function initializeRealtimeSync() {
  const env = window.ENV || {};
  const supabaseUrl = String(env.SUPABASE_URL || CONFIG?.SUPABASE?.URL || "").trim();
  const supabaseKey = String(env.SUPABASE_KEY || CONFIG?.SUPABASE?.KEY || "").trim();

  if (supabaseUrl && supabaseKey) {
    RealtimeService.initSupabase(supabaseUrl, supabaseKey);
  } else {
    console.warn("[DISPLAY] Supabase credentials manquants: fallback WebSocket + polling.");
  }

  const wsConn = RealtimeService.connectWebSocket();
  wsConn.onConnect(() => {
    state.wsReconnectAttempt = 0;
    touchRealtimeActivity();
    setConnectionStatus(false);
    refreshQueue().catch(() => {});
  });

  wsConn.onDisconnect(() => {
    setConnectionStatus(true);
    scheduleWsReconnect("on_disconnect");
  });

  startWsMonitor();
}

function updateHeader() {
  const text = [];
  let estName = "";
  if (state.selectedEst) {
    const est = state.establishments.find((e) => e.id === state.selectedEst);
    if (est) {
      estName = est.name || "";
      text.push(est.name);
    }
  }
  if (state.allQueuesMode) {
    text.push("Toutes les files");
  } else if (state.selectedQueue) {
    const q = state.queues.find((qItem) => qItem.id === state.selectedQueue);
    if (q) text.push(q.name);
  }

  const headerEl = document.getElementById("headerContext");
  if (headerEl) {
    headerEl.textContent = text.length ? text.join(" | ") : "Selectionnez un etablissement et une file";
  }

  const titleEl = document.getElementById("establishmentTitle");
  if (titleEl) {
    titleEl.textContent = state.ui.customTitle || estName || "WAQTEK";
  }
}

function renderWaiting(tickets) {
  const container = document.getElementById("waitingList");
  const countEl = document.getElementById("waitingCount");
  if (!container) return;

  const fullList = Array.isArray(tickets) ? tickets : [];
  const list = fullList.slice(0, 12);

  container.innerHTML = list.map((t, i) => `
    <div class="bg-slate-700/70 rounded-lg px-3 py-4 text-center border border-slate-600 ${i === 0 ? "ring-2 ring-indigo-400" : ""}">
      <div class="text-3xl font-bold">${escapeHtml(t.number || "-")}</div>
      <p class="text-xs text-slate-400 mt-1">${escapeHtml(t.__queueName || "-")}</p>
      <p class="text-xs text-slate-400 mt-1">Position ${i + 1}</p>
    </div>
  `).join("");

  if (countEl) countEl.textContent = `${fullList.length} en attente`;
}

function renderCalled(ticket) {
  const container = document.getElementById("calledList");
  if (!container) return;

  const list = Array.isArray(ticket) ? ticket : (ticket ? [ticket] : []);
  if (list.length === 0) {
    container.className = "grid gap-3";
    container.innerHTML = '<p class="text-slate-500 text-sm">Aucun ticket appele</p>';
    return;
  }

  if (list.length <= 8) {
    container.className = "grid gap-3 grid-cols-1";
  } else if (list.length <= 20) {
    container.className = "grid gap-2 grid-cols-2";
  } else {
    container.className = "grid gap-2 grid-cols-3";
  }

  let cardClass = "rounded-lg p-4 text-slate-900 flex items-center justify-between shadow";
  let numberClass = "text-3xl font-black leading-none";
  let sideClass = "text-xl font-bold";
  let messageClass = "text-xs mt-1 opacity-90";

  if (list.length >= 7 && list.length <= 10) {
    cardClass = "rounded-lg p-3 text-slate-900 flex items-center justify-between shadow";
    numberClass = "text-2xl font-black leading-none";
    sideClass = "text-lg font-bold";
    messageClass = "text-[11px] mt-1 opacity-90";
  } else if (list.length >= 11 && list.length <= 16) {
    cardClass = "rounded-lg p-2.5 text-slate-900 flex items-center justify-between shadow";
    numberClass = "text-xl font-black leading-none";
    sideClass = "text-base font-bold";
    messageClass = "text-[10px] mt-1 opacity-90";
  } else if (list.length > 16) {
    cardClass = "rounded-lg p-2 text-slate-900 flex items-center justify-between shadow";
    numberClass = "text-lg font-black leading-none";
    sideClass = "text-sm font-bold";
    messageClass = "text-[9px] mt-1 opacity-90";
  }

  const palette = ["bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-fuchsia-500", "bg-rose-500", "bg-indigo-500"];
  container.innerHTML = list.map((t, i) => `
    <div class="${cardClass} ${palette[i % palette.length]}">
      <div>
        <p class="text-xs uppercase tracking-wide opacity-80">Queue ${escapeHtml(t.__queueName || "-")}</p>
        <p class="${numberClass}">${escapeHtml(t.number || "-")}</p>
        <p class="${messageClass}">Client de la queue ${escapeHtml(t.__queueName || "-")}, presentez-vous au guichet ${escapeHtml(t.counter || "-")}.</p>
      </div>
      <div class="text-right">
        <p class="text-xs uppercase tracking-wide opacity-80">Guichet</p>
        <p class="${sideClass}">${escapeHtml(t.counter || "-")}</p>
      </div>
    </div>
  `).join("");
}

function renderCalledBoard(waitingTickets) {
  const board = document.getElementById("calledBoard");
  if (!board) return;

  const list = Array.isArray(waitingTickets) ? waitingTickets : [];

  if (list.length === 0) {
    board.style.gridTemplateColumns = "";
    board.innerHTML = "";
    return;
  }

  const grouped = new Map();
  list.forEach((ticket) => {
    const key = ticket.__queueName || "-";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(ticket);
  });

  const queueNames = Array.from(grouped.keys());
  board.style.gridTemplateColumns = `repeat(${queueNames.length}, minmax(0, 1fr))`;

  board.innerHTML = queueNames.map((queueName, idx) => {
    const queueTickets = grouped.get(queueName) || [];
    const nextTwo = queueTickets.slice(0, 2);
    const palette = getQueuePalette(queueName);

    const ticketCardsHtml = nextTwo.map((t) => `
      <div class="rounded-lg border ${palette.chip} px-3 py-3">
        <p class="text-white font-bold text-2xl md:text-4xl leading-tight">No ${escapeHtml(t.number || "-")}</p>
        <p class="text-white/90 font-semibold text-base md:text-lg mt-1 leading-tight">PROCHAIN</p>
      </div>
    `).join("");

    const dividerClass = idx > 0 ? "border-l border-white/20 md:pl-2" : "";
    return `
      <div class="${dividerClass} rounded-xl border p-2 ${palette.panel}">
        <p class="text-lg md:text-xl uppercase tracking-wide text-white mb-2 font-semibold">Queue ${escapeHtml(queueName)}</p>
        <div class="rounded-lg border ${palette.chip} p-2">
          <div class="grid grid-cols-2 gap-2">
            ${ticketCardsHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function queueIdsToDisplay() {
  if (state.allQueuesMode) {
    return (state.queues || []).map((q) => q.id);
  }
  return state.selectedQueue ? [state.selectedQueue] : [];
}

async function refreshQueue() {
  if (state.refreshInFlight) return;
  state.refreshInFlight = true;
  const refreshGuard = setTimeout(() => { setConnectionStatus(true); }, REFRESH_FALLBACK_TIMEOUT_MS);

  try {
    const queueIds = queueIdsToDisplay();
    if (queueIds.length === 0) return;

    const queueNameMap = new Map((state.queues || []).map((q) => [q.id, q.name || q.id]));
    const allWaiting = [];
    const allCalled = [];
    let onlineAtLeastOnce = false;

    for (const queueId of queueIds) {
      try {
        const tickets = await TicketService.getQueueTickets(queueId);
        writeCachedTickets(queueId, tickets);
        onlineAtLeastOnce = true;
        touchRealtimeActivity();

        const queueName = queueNameMap.get(queueId) || queueId;
        tickets.forEach((t) => {
          const enriched = { ...t, __queueId: queueId, __queueName: queueName };
          if (t.status === "called") allCalled.push(enriched);
          if (t.status === "waiting" || !t.status) allWaiting.push(enriched);
        });
      } catch (e) {
        if (!isOfflineError(e)) {
          console.error(e);
        }

        const queueName = queueNameMap.get(queueId) || queueId;
        const cached = readCachedTickets(queueId);
        cached.forEach((t) => {
          const enriched = { ...t, __queueId: queueId, __queueName: queueName };
          if (t.status === "called") allCalled.push(enriched);
          if (t.status === "waiting" || !t.status) allWaiting.push(enriched);
        });
      }
    }

    allWaiting.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    allCalled.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

    renderWaiting(allWaiting);
    detectAndChime(allCalled);
    renderCalled(allCalled);
    renderCalledBoard(allWaiting);
    setConnectionStatus(!onlineAtLeastOnce);
  } finally {
    clearTimeout(refreshGuard);
    state.refreshInFlight = false;
  }
}

function setupRealtime() {
  if (Array.isArray(state.realtimeUnsubs) && state.realtimeUnsubs.length > 0) {
    state.realtimeUnsubs.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    state.realtimeUnsubs = [];
  }

  const queueIds = queueIdsToDisplay();
  if (queueIds.length === 0) return;

  state.realtimeUnsubs = queueIds.map((queueId) =>
    RealtimeService.subscribeToQueue(queueId, () => { touchRealtimeActivity(); refreshQueue(); })
  );
}

function detectAndChime(calledList) {
  const ids = new Set(calledList.map((t) => `${t.__queueId || "q"}:${t.id}`));
  const newCalled = [];
  calledList.forEach((t) => {
    const key = `${t.__queueId || "q"}:${t.id}`;
    if (!state.lastCalledIds.has(key)) newCalled.push(t);
  });
  state.lastCalledIds = ids;
  if (newCalled.length > 0) {
    playChime();
    enqueueCallPopups(newCalled);
  }
}

function enqueueCallPopups(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  if (list.length === 0) return;
  list.forEach((ticket) => state.popupQueue.push(ticket));
  processCallPopupQueue();
}

function processCallPopupQueue() {
  if (state.popupActive) return;
  const nextTicket = state.popupQueue.shift();
  if (!nextTicket) return;
  state.popupActive = true;
  showCallPopup(nextTicket).finally(() => {
    state.popupActive = false;
    processCallPopupQueue();
  });
}

function showCallPopup(ticket) {
  return new Promise((resolve) => {
    const layer = document.getElementById("callPopupLayer");
    if (!layer) {
      resolve();
      return;
    }

    const palette = getQueuePalette(ticket?.__queueName || "-");

    layer.classList.remove("hidden");
    layer.classList.add("flex");
    layer.innerHTML = `
      <div id="callPopupCard" class="call-popup-enter w-[50vw] h-[50vh] min-w-[320px] min-h-[260px] rounded-2xl border ${palette.popup} text-white shadow-2xl p-6 flex flex-col items-center justify-center text-center">
        <p class="text-base md:text-lg uppercase tracking-[0.18em] font-semibold opacity-95">Ticket appele</p>
        <p class="mt-5 text-6xl md:text-7xl font-black leading-none">${escapeHtml(ticket.number || "-")}</p>
        <p class="mt-6 text-xl md:text-2xl font-semibold">Queue ${escapeHtml(ticket.__queueName || "-")}</p>
        <p class="mt-2 text-2xl md:text-3xl font-extrabold">Guichet ${escapeHtml(ticket.counter || "-")}</p>
        <p class="mt-4 text-sm md:text-base opacity-95">Presentez-vous immediatement.</p>
      </div>
    `;

    const card = document.getElementById("callPopupCard");
    setTimeout(() => {
      if (card) {
        card.classList.remove("call-popup-enter");
        card.classList.add("call-popup-out");
      }
    }, 4700);

    setTimeout(() => {
      layer.innerHTML = "";
      layer.classList.remove("flex");
      layer.classList.add("hidden");
      resolve();
    }, 5000);
  });
}

function playChime() {
  if (!state.audioEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

function enableAudioOnFirstGesture() {
  const unlock = () => {
    state.audioEnabled = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

async function loadOptions() {
  const ests = await EstablishmentService.getEstablishments();
  state.establishments = ests || [];
  const estSelect = document.getElementById("estSelect");
  estSelect.innerHTML = '<option value="">Selectionner...</option>' + state.establishments.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join("");
  if (state.selectedEst) estSelect.value = state.selectedEst;
  await loadQueuesForEst(state.selectedEst);
}

async function loadQueuesForEst(estId) {
  const select = document.getElementById("queueSelect");
  if (!select) return;

  select.disabled = !estId;
  if (!estId) {
    select.innerHTML = '<option value="">Selectionner...</option>';
    await loadSavedVideosForEst(null);
    return;
  }

  const queues = await QueueService.getQueuesByEstablishment(estId);
  state.queues = queues || [];

  select.innerHTML = '<option value="">Selectionner...</option><option value="__ALL__">Toutes les files</option>' + state.queues.map((q) => `<option value="${q.id}">${escapeHtml(q.name)}</option>`).join("");

  if (state.allQueuesMode) {
    select.value = "__ALL__";
  } else if (state.selectedQueue) {
    select.value = state.selectedQueue;
  }

  await loadSavedVideosForEst(estId);
}

function openSettings() {
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.classList.add("flex");
}

function closeSettings() {
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;
  panel.classList.remove("flex");
  panel.classList.add("hidden");
}

function initEvents() {
  document.getElementById("settingsBtn").onclick = openSettings;
  document.getElementById("closeSettings").onclick = closeSettings;

  document.getElementById("estSelect").onchange = async (e) => {
    state.selectedEst = e.target.value || null;
    state.selectedQueue = null;
    state.allQueuesMode = false;
    await loadQueuesForEst(state.selectedEst);
  };

  document.getElementById("queueSelect").onchange = (e) => {
    const value = e.target.value || null;
    state.allQueuesMode = value === "__ALL__";
    state.selectedQueue = state.allQueuesMode ? null : value;
  };

  document.getElementById("savedVideoSelect").onchange = (e) => {
    const selectedId = String(e.target.value || "").trim();
    if (!selectedId) return;

    const selected = (state.savedVideos || []).find((v) => String(v.id || "") === selectedId);
    if (!selected) return;

    state.adVideoUrl = String(selected.lien || selected.url || "").trim();
    state.adVideoName = String(selected?.nom || selected?.name || "").trim();

    const nameInput = document.getElementById("adVideoNameInput");
    const urlInput = document.getElementById("adVideoUrlInput");
    if (nameInput) nameInput.value = state.adVideoName;
    if (urlInput) urlInput.value = state.adVideoUrl;
  };

  document.getElementById("saveSettings").onclick = async () => {
    const nameInput = document.getElementById("adVideoNameInput");
    const urlInput = document.getElementById("adVideoUrlInput");
    const savedVideoSelect = document.getElementById("savedVideoSelect");
    const selectedSavedVideoId = String(savedVideoSelect?.value || "").trim();
    state.adVideoName = String(nameInput?.value || "").trim();
    state.adVideoUrl = String(urlInput?.value || "").trim();

    const customTitleInput = document.getElementById("uiTitleInput");
    const accentInput = document.getElementById("uiAccentInput");
    const headerBgInput = document.getElementById("uiHeaderBgInput");
    const logoInput = document.getElementById("uiLogoInput");
    const opacityInput = document.getElementById("uiVideoOpacityInput");
    const hideSettingsInput = document.getElementById("uiHideSettingsInput");

    state.ui.customTitle = String(customTitleInput?.value || "").trim();
    state.ui.accentColor = String(accentInput?.value || "#4f46e5").trim() || "#4f46e5";
    state.ui.headerBg = String(headerBgInput?.value || "rgba(15,23,42,0.55)").trim() || "rgba(15,23,42,0.55)";
    state.ui.logoUrl = String(logoInput?.value || "").trim();
    state.ui.videoOpacity = Number(opacityInput?.value || 1);
    state.ui.hideSettingsButton = Boolean(hideSettingsInput?.checked);

    if (selectedSavedVideoId) {
      try {
        const videoService = await ensureVideoServiceLoaded();
        const video = await videoService.getVideoById(selectedSavedVideoId);
        if (video) {
          state.adVideoName = String(video.nom || video.name || "").trim();
          state.adVideoUrl = String(video.lien || video.url || "").trim();
          if (nameInput) nameInput.value = state.adVideoName;
          if (urlInput) urlInput.value = state.adVideoUrl;
        }
      } catch (error) {
        console.error("[DISPLAY] Load selected video from DB error:", error);
        showToast("Impossible de recuperer le lien video depuis la base", "error");
        return;
      }
    }

    const shouldCreateNewVideo =
      state.selectedEst &&
      state.adVideoName &&
      state.adVideoUrl &&
      !selectedSavedVideoId;

    if (shouldCreateNewVideo) {
      try {
        const videoService = await ensureVideoServiceLoaded();
        await videoService.createVideo(state.selectedEst, state.adVideoName, state.adVideoUrl);
        await loadSavedVideosForEst(state.selectedEst);
      } catch (error) {
        console.error("[DISPLAY] Save video error:", error);
        showToast("Impossible d'enregistrer la video", "error");
      }
    }

    saveSettings();
    applyUiSettings();
    applyAdVideoSource({ requestFullscreen: true });
    updateHeader();
    renderQr();
    setupRealtime();
    await refreshQueue();
    closeSettings();
  };
}

async function bootstrap() {
  if (!AuthService.requireAuth("sign-in.html")) return;

  initializeRealtimeSync();
  loadSettings();
  loadSettingsFromUrl();
  enableAudioOnFirstGesture();
  initEvents();
  await loadOptions();
  const nameInput = document.getElementById("adVideoNameInput");
  const urlInput = document.getElementById("adVideoUrlInput");
  if (nameInput) {
    nameInput.value = state.adVideoName || "";
  }
  if (urlInput) {
    urlInput.value = state.adVideoUrl || "";
  }
  const customTitleInput = document.getElementById("uiTitleInput");
  const accentInput = document.getElementById("uiAccentInput");
  const headerBgInput = document.getElementById("uiHeaderBgInput");
  const logoInput = document.getElementById("uiLogoInput");
  const opacityInput = document.getElementById("uiVideoOpacityInput");
  const hideSettingsInput = document.getElementById("uiHideSettingsInput");

  if (customTitleInput) customTitleInput.value = state.ui.customTitle || "";
  if (accentInput) accentInput.value = state.ui.accentColor || "#4f46e5";
  if (headerBgInput) headerBgInput.value = state.ui.headerBg || "rgba(15,23,42,0.55)";
  if (logoInput) logoInput.value = state.ui.logoUrl || "";
  if (opacityInput) opacityInput.value = String(state.ui.videoOpacity ?? 1);
  if (hideSettingsInput) hideSettingsInput.checked = !!state.ui.hideSettingsButton;

  applyUiSettings();
  applyAdVideoSource();
  updateHeader();
  renderQr();

  if (queueIdsToDisplay().length > 0) {
    setupRealtime();
    await refreshQueue();
  }

  window.addEventListener("online", () => {
    setConnectionStatus(false);
    touchRealtimeActivity();
    scheduleWsReconnect("browser_online");
    refreshQueue();
  });

  window.addEventListener("offline", () => {
    setConnectionStatus(true);
  });

  // Safety polling (lower rate) in case realtime events are missed.
  setInterval(refreshQueue, 7000);
}

document.addEventListener("DOMContentLoaded", bootstrap);

