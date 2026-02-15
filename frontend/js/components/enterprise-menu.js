(function () {
  if (window.__ENTERPRISE_MENU_READY__) return;
  window.__ENTERPRISE_MENU_READY__ = true;

  const pages = Array.isArray(window.ENTERPRISE_PAGES) ? window.ENTERPRISE_PAGES : [];
  if (!pages.length) return;

  function normalizeRole(role) {
    const raw = String(role || "").trim().toUpperCase();
    if (!raw) return "PUBLIC";
    if (raw === "ENTERPRISE") return "MANAGER";
    return raw;
  }

  function isAuthenticated() {
    try {
      return !!window.state?.getToken?.();
    } catch (_) {
      return false;
    }
  }

  function getRoleFromLocalState() {
    try {
      const fromState = window.state?.getUser?.();
      if (fromState?.normalizedRole || fromState?.role) {
        return normalizeRole(fromState.normalizedRole || fromState.role);
      }
      const raw = localStorage.getItem("waqtek_user");
      if (!raw) return "PUBLIC";
      const user = JSON.parse(raw);
      return normalizeRole(user?.normalizedRole || user?.role);
    } catch (_) {
      return "PUBLIC";
    }
  }

  async function resolveCurrentRole() {
    if (!isAuthenticated()) {
      return "PUBLIC";
    }

    try {
      const profile = await window.api?.getAuthMe?.();
      if (profile?.user) {
        window.state?.setUser?.(profile.user);
      }
      return normalizeRole(profile?.user?.normalizedRole || profile?.user?.role);
    } catch (_) {
      return getRoleFromLocalState();
    }
  }

  function hasRoleAccess(page, role) {
    const allowed = Array.isArray(page.allowedRoles) ? page.allowedRoles : [];
    if (!allowed.length) return role === "PUBLIC";
    return allowed.map(normalizeRole).includes(normalizeRole(role));
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

  function isSamePage(urlA, urlB) {
    try {
      const a = new URL(urlA);
      const b = new URL(urlB);
      return a.pathname === b.pathname;
    } catch (_) {
      return urlA === urlB;
    }
  }

  async function buildMenu() {
    const role = await resolveCurrentRole();
    const filteredPages = pages.filter((page) => hasRoleAccess(page, role));
    if (!filteredPages.length) return;

    const root = document.createElement("nav");
    root.className = "enterprise-menu-root";
    root.setAttribute("aria-label", "Enterprise Navigation");

    const inner = document.createElement("div");
    inner.className = "enterprise-menu-inner";

    const brand = document.createElement("div");
    brand.className = "enterprise-menu-brand";
    brand.textContent = "WaQtek Enterprise";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "enterprise-menu-toggle";
    toggle.textContent = "Menu";
    toggle.setAttribute("aria-expanded", "false");

    const links = document.createElement("ul");
    links.className = "enterprise-menu-links";

    const currentUrl = window.location.href;
    filteredPages.forEach((page) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const href = resolvePageUrl(page.path);
      link.href = href;
      link.textContent = page.label;
      link.dataset.pageId = page.id;
      if (isSamePage(currentUrl, href)) {
        link.classList.add("is-active");
      }
      li.appendChild(link);
      links.appendChild(li);
    });

    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    inner.appendChild(brand);
    inner.appendChild(toggle);
    inner.appendChild(links);
    root.appendChild(inner);

    document.body.prepend(root);

    const computed = window.getComputedStyle(document.body);
    const currentPaddingTop = parseFloat(computed.paddingTop || "0") || 0;
    const menuHeight = root.getBoundingClientRect().height || 56;
    document.body.style.paddingTop = `${currentPaddingTop + menuHeight}px`;
    document.documentElement.style.setProperty("--enterprise-menu-offset", `${menuHeight}px`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildMenu);
  } else {
    buildMenu();
  }
})();
