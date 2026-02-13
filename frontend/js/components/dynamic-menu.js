(function () {
  if (!Array.isArray(window.APP_PAGES)) return;
  if (window.__APP_DYNAMIC_MENU_INITIALIZED__) return;
  window.__APP_DYNAMIC_MENU_INITIALIZED__ = true;

  const PAGES = window.APP_PAGES;

  function inferRole() {
    try {
      const raw = localStorage.getItem("waqtek_user");
      if (!raw) return "public";
      const user = JSON.parse(raw);
      const role = String(user?.role || "").toLowerCase();
      if (role === "admin" || role === "manager" || role === "enterprise") return "manager";
      return "public";
    } catch (_) {
      return "public";
    }
  }

  function getFrontendBaseUrl() {
    const marker = "/frontend/";
    const href = window.location.href;
    const markerIndex = href.indexOf(marker);
    if (markerIndex >= 0) {
      return href.slice(0, markerIndex + marker.length);
    }
    return new URL("./", window.location.href).href;
  }

  function resolvePageUrl(path) {
    return new URL(path, getFrontendBaseUrl()).href;
  }

  function samePage(urlA, urlB) {
    try {
      const a = new URL(urlA);
      const b = new URL(urlB);
      return a.pathname === b.pathname;
    } catch (_) {
      return urlA === urlB;
    }
  }

  function filterPagesForMenu() {
    const role = inferRole();
    if (role === "manager") {
      return PAGES.filter((p) => p.role !== "display");
    }
    return PAGES.filter((p) => p.role === "public" || p.role === "display");
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .app-dm-toggle {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        border: 0;
        border-radius: 999px;
        background: #0f172a;
        color: #fff;
        padding: 10px 14px;
        font: 600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        box-shadow: 0 10px 22px rgba(0,0,0,.25);
        cursor: pointer;
      }
      .app-dm-overlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background: rgba(2,6,23,.42);
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease;
      }
      .app-dm-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .app-dm-panel {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 9999;
        height: 100%;
        width: min(360px, 90vw);
        background: #fff;
        border-left: 1px solid #dbe4ee;
        transform: translateX(100%);
        transition: transform .2s ease;
        display: flex;
        flex-direction: column;
      }
      .app-dm-panel.open {
        transform: translateX(0);
      }
      .app-dm-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .app-dm-title {
        margin: 0;
        font: 700 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #0f172a;
        letter-spacing: .02em;
        text-transform: uppercase;
      }
      .app-dm-close {
        border: 0;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        color: #334155;
      }
      .app-dm-list {
        margin: 0;
        padding: 10px;
        list-style: none;
        overflow-y: auto;
      }
      .app-dm-item a {
        display: block;
        padding: 11px 12px;
        border-radius: 8px;
        text-decoration: none;
        font: 500 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: #0f172a;
      }
      .app-dm-item a:hover {
        background: #f1f5f9;
      }
      .app-dm-item a.active {
        background: #0f172a;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function mountMenu() {
    injectStyles();

    const toggle = document.createElement("button");
    toggle.className = "app-dm-toggle";
    toggle.type = "button";
    toggle.textContent = "Menu";

    const overlay = document.createElement("div");
    overlay.className = "app-dm-overlay";

    const panel = document.createElement("aside");
    panel.className = "app-dm-panel";
    panel.innerHTML = `
      <div class="app-dm-head">
        <h2 class="app-dm-title">Navigation</h2>
        <button type="button" class="app-dm-close" aria-label="Close menu">×</button>
      </div>
      <ul class="app-dm-list"></ul>
    `;

    const list = panel.querySelector(".app-dm-list");
    const currentUrl = window.location.href;

    filterPagesForMenu().forEach((page) => {
      const href = resolvePageUrl(page.path);
      const li = document.createElement("li");
      li.className = "app-dm-item";
      li.innerHTML = `<a href="${href}">${page.menuLabel}</a>`;
      const link = li.querySelector("a");
      if (samePage(currentUrl, href)) {
        link.classList.add("active");
      }
      list.appendChild(li);
    });

    function open() {
      overlay.classList.add("open");
      panel.classList.add("open");
    }

    function close() {
      overlay.classList.remove("open");
      panel.classList.remove("open");
    }

    toggle.addEventListener("click", open);
    overlay.addEventListener("click", close);
    panel.querySelector(".app-dm-close").addEventListener("click", close);

    document.body.appendChild(toggle);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountMenu);
  } else {
    mountMenu();
  }
})();
