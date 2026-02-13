(() => {
  const scriptPromises = new Map();

  function toAbsoluteUrl(src) {
    return new URL(src, window.location.href).href;
  }

  function loadScript(src) {
    const url = toAbsoluteUrl(src);
    if (scriptPromises.has(url)) {
      return scriptPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = () => resolve(url);
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });

    scriptPromises.set(url, promise);
    return promise;
  }

  async function loadScriptsSequentially(sources = []) {
    for (const source of sources) {
      await loadScript(source);
    }
  }

  window.loadScript = loadScript;
  window.lazyLoadFeature = async function lazyLoadFeature(name, sources) {
    try {
      await loadScriptsSequentially(sources);
      return true;
    } catch (error) {
      console.error(`[LAZY] ${name} load failed:`, error);
      return false;
    }
  };
})();
