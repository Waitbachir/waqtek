(function () {
  if (window.__ENTERPRISE_MENU_READY__) return;
  window.__ENTERPRISE_MENU_READY__ = true;

  const pages = Array.isArray(window.ENTERPRISE_PAGES) ? window.ENTERPRISE_PAGES : [];
  if (!pages.length) return;

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

  function buildMenu() {
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
    pages.forEach((page) => {
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildMenu);
  } else {
    buildMenu();
  }
})();
