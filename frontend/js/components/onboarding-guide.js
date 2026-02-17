(function () {
  if (window.__WAQTEK_ONBOARDING_READY__) return;
  window.__WAQTEK_ONBOARDING_READY__ = true;

  const STORAGE_PREFIX = "waqtek_onboarding_seen_v1";
  const TARGET_CLASS = "waqtek-onboarding-target";

  const state = {
    active: false,
    role: "PUBLIC",
    userId: "anonymous",
    flow: null,
    steps: [],
    index: 0,
    overlay: null,
    card: null,
    launcher: null,
    currentTarget: null
  };

  function normalizeRole(role) {
    const raw = String(role || "").trim().toUpperCase();
    if (!raw) return "PUBLIC";
    if (raw === "ENTERPRISE") return "MANAGER";
    return raw;
  }

  function getCurrentPageName() {
    return window.location.pathname.split("/").pop() || "";
  }

  function getStorageKey(flowKey) {
    return `${STORAGE_PREFIX}::${state.userId}::${state.role}::${flowKey}`;
  }

  function hasSeen(flowKey) {
    return localStorage.getItem(getStorageKey(flowKey)) === "1";
  }

  function markSeen(flowKey) {
    localStorage.setItem(getStorageKey(flowKey), "1");
  }

  function clearCurrentTarget() {
    if (state.currentTarget) {
      state.currentTarget.classList.remove(TARGET_CLASS);
      state.currentTarget = null;
    }
  }

  function removeGuideDom() {
    clearCurrentTarget();
    if (state.overlay) state.overlay.remove();
    if (state.card) state.card.remove();
    state.overlay = null;
    state.card = null;
  }

  function closeGuide(markAsSeen) {
    if (!state.active) return;
    if (markAsSeen && state.flow?.key) {
      markSeen(state.flow.key);
    }
    state.active = false;
    removeGuideDom();
    window.removeEventListener("resize", repositionCard);
    window.removeEventListener("keydown", onEscapeClose);
  }

  function onEscapeClose(event) {
    if (event.key === "Escape") {
      closeGuide(true);
    }
  }

  function createGuideDom() {
    state.overlay = document.createElement("div");
    state.overlay.className = "waqtek-onboarding-overlay";

    state.card = document.createElement("aside");
    state.card.className = "waqtek-onboarding-card";
    state.card.innerHTML = `
      <div class="waqtek-onboarding-head">
        <h3 class="waqtek-onboarding-title" id="waqtekOnboardingTitle">Guide</h3>
        <button type="button" class="waqtek-onboarding-close" id="waqtekOnboardingClose" aria-label="Fermer">×</button>
      </div>
      <p class="waqtek-onboarding-content" id="waqtekOnboardingContent"></p>
      <div class="waqtek-onboarding-progress" id="waqtekOnboardingProgress"></div>
      <div class="waqtek-onboarding-actions">
        <button type="button" class="waqtek-onboarding-btn secondary" id="waqtekOnboardingSkip">Ignorer</button>
        <button type="button" class="waqtek-onboarding-btn secondary" id="waqtekOnboardingPrev">Retour</button>
        <button type="button" class="waqtek-onboarding-btn primary" id="waqtekOnboardingNext">Suivant</button>
      </div>
    `;

    document.body.appendChild(state.overlay);
    document.body.appendChild(state.card);

    state.card.querySelector("#waqtekOnboardingClose").addEventListener("click", () => closeGuide(true));
    state.card.querySelector("#waqtekOnboardingSkip").addEventListener("click", () => closeGuide(true));
    state.card.querySelector("#waqtekOnboardingPrev").addEventListener("click", prevStep);
    state.card.querySelector("#waqtekOnboardingNext").addEventListener("click", nextStep);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  async function findTarget(selector, attempts = 8, delayMs = 120) {
    if (!selector) return null;
    for (let i = 0; i < attempts; i += 1) {
      const target = document.querySelector(selector);
      if (target) return target;
      // Wait for async UI rendering (menu, cards, etc.)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  }

  function repositionCard() {
    if (!state.active || !state.card) return;
    const step = state.steps[state.index];
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardRect = state.card.getBoundingClientRect();

    if (!step || !state.currentTarget) {
      state.card.style.top = `${Math.round((vh - cardRect.height) / 2)}px`;
      state.card.style.left = `${Math.round((vw - cardRect.width) / 2)}px`;
      return;
    }

    const rect = state.currentTarget.getBoundingClientRect();
    const placement = step.placement || "bottom";
    let top = rect.bottom + 10;
    let left = rect.left;

    if (placement === "top") {
      top = rect.top - cardRect.height - 10;
      left = rect.left;
    } else if (placement === "right") {
      top = rect.top;
      left = rect.right + 10;
    } else if (placement === "left") {
      top = rect.top;
      left = rect.left - cardRect.width - 10;
    }

    left = clamp(left, margin, vw - cardRect.width - margin);
    top = clamp(top, margin, vh - cardRect.height - margin);

    state.card.style.left = `${Math.round(left)}px`;
    state.card.style.top = `${Math.round(top)}px`;
  }

  async function showStep(index) {
    const step = state.steps[index];
    if (!step) return;

    state.index = index;
    clearCurrentTarget();

    const titleEl = state.card.querySelector("#waqtekOnboardingTitle");
    const contentEl = state.card.querySelector("#waqtekOnboardingContent");
    const progressEl = state.card.querySelector("#waqtekOnboardingProgress");
    const prevBtn = state.card.querySelector("#waqtekOnboardingPrev");
    const nextBtn = state.card.querySelector("#waqtekOnboardingNext");

    titleEl.textContent = step.title || "Guide";
    contentEl.textContent = step.content || "";
    progressEl.textContent = `Etape ${index + 1} / ${state.steps.length}`;
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === state.steps.length - 1 ? "Terminer" : "Suivant";

    if (step.target) {
      const target = await findTarget(step.target);
      if (target) {
        state.currentTarget = target;
        target.classList.add(TARGET_CLASS);
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    repositionCard();
  }

  function prevStep() {
    if (!state.active) return;
    if (state.index <= 0) return;
    showStep(state.index - 1);
  }

  function nextStep() {
    if (!state.active) return;
    if (state.index >= state.steps.length - 1) {
      closeGuide(true);
      return;
    }
    showStep(state.index + 1);
  }

  function startGuide(options = {}) {
    const { force = false } = options;
    if (!state.flow) return;
    if (!force && hasSeen(state.flow.key)) return;

    state.active = true;
    state.steps = Array.isArray(state.flow.steps) ? state.flow.steps : [];
    if (!state.steps.length) return;

    createGuideDom();
    window.addEventListener("resize", repositionCard);
    window.addEventListener("keydown", onEscapeClose);
    showStep(0);
  }

  function createLauncher() {
    if (!state.flow) return;
    if (state.launcher) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "waqtek-onboarding-launcher";
    button.textContent = "Afficher le guide";
    button.addEventListener("click", () => {
      if (state.active) return;
      startGuide({ force: true });
    });
    state.launcher = button;
    document.body.appendChild(button);
  }

  async function resolveUserContext() {
    const localUser = window.state?.getUser?.() || {};
    const localRole = normalizeRole(localUser.normalizedRole || localUser.role);
    state.userId = String(localUser.id || "anonymous");
    state.role = localRole;

    if (!window.state?.getToken?.()) return;

    try {
      const profile = await window.AuthService?.getMe?.();
      const user = profile?.user || {};
      if (user?.id) state.userId = String(user.id);
      state.role = normalizeRole(user.normalizedRole || user.role || localRole);
    } catch (_) {
      // Fallback to local state only.
    }
  }

  function resolveFlowForCurrentPage() {
    const pageName = getCurrentPageName();
    const flows = window.WAQTEK_ONBOARDING_FLOWS || {};
    const flow = flows[state.role];
    if (!flow) return null;
    const allowedPages = Array.isArray(flow.pages) ? flow.pages : [];
    if (!allowedPages.includes(pageName)) return null;
    return flow;
  }

  async function initOnboarding() {
    await resolveUserContext();
    state.flow = resolveFlowForCurrentPage();
    if (!state.flow) return;

    createLauncher();
    if (!hasSeen(state.flow.key)) {
      // Give time to page-specific widgets to mount before first step.
      setTimeout(() => startGuide({ force: true }), 450);
    }
  }

  window.WaqtekOnboarding = {
    init: initOnboarding,
    start: () => startGuide({ force: true }),
    resetSeen: () => {
      if (state.flow?.key) localStorage.removeItem(getStorageKey(state.flow.key));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnboarding);
  } else {
    initOnboarding();
  }
})();
