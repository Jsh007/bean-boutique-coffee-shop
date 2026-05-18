/*
 * Eigbe Joshua, 224473, Frontend web development
 * Setup gate + global AOS (stylesheet + script; bootstrapped once from init.js everywhere).
 */

(function () {
  "use strict";

  var STORAGE_KEY = "bbe_setup_complete";

  var AOS_JS_MIRRORS = [
    "https://unpkg.com/aos@2.3.4/dist/aos.js",
    "https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js",
  ];

  function isSetupPage(pathname) {
    return pathname.indexOf("pages/setup/setup.html") !== -1;
  }

  /**
   * If the pathname looks like a directory but omits the trailing slash, the
   * browser resolves sibling-relative links like "products/foo.html" from the
   * parent path segment (RFC 3986), which yields 404s with static hosts.
   */
  function canonicalizeDirectoryUrl() {
    var path = window.location.pathname;
    if (!path || path === "/") {
      return;
    }
    if (path.endsWith("/")) {
      return;
    }
    var slash = path.lastIndexOf("/");
    var last = slash >= 0 ? path.slice(slash + 1) : path;
    if (last.indexOf(".") !== -1) {
      return;
    }
    try {
      history.replaceState(
        null,
        "",
        path + "/" + window.location.search + window.location.hash
      );
    } catch (ignore) {}
  }

  /** Folder containing init.js (= site root). Needed when the host serves above project (Live Server workspace root). */
  function inferredSiteRootHref() {
    var scripts = document.getElementsByTagName("script");
    var i;
    for (i = 0; i < scripts.length; i++) {
      var srcAttr = scripts[i].getAttribute("src");
      if (!srcAttr || srcAttr.indexOf("init.js") === -1) {
        continue;
      }
      try {
        var absolute = new URL(srcAttr, window.location.href).href;
        var u = new URL(absolute);
        var p = u.pathname;
        var slash = p.lastIndexOf("/");
        var dir = slash >= 0 ? p.slice(0, slash + 1) : "/";
        return u.origin + dir;
      } catch (e2) {
        break;
      }
    }
    return window.location.origin + "/";
  }

  function resolvedSetupUrl() {
    var configured =
      typeof window.BEAN_BOUTIQUE_BASE === "string"
        ? window.BEAN_BOUTIQUE_BASE
        : "";

    try {
      if (configured) {
        var normalized = configured.endsWith("/")
          ? configured
          : configured + "/";
        return new URL("pages/setup/setup.html", normalized).href;
      }
      var root = inferredSiteRootHref();
      return new URL("pages/setup/setup.html", root).href;
    } catch (error) {
      try {
        return new URL("pages/setup/setup.html", inferredSiteRootHref()).href;
      } catch (e3) {
        return "pages/setup/setup.html";
      }
    }
  }

  /** No-op refresh until library finishes booting — safe anywhere. */
  window.BeanBoutiqueAOS = window.BeanBoutiqueAOS || {};
  window.BeanBoutiqueAOS.refresh =
    window.BeanBoutiqueAOS.refresh || function noop() {};

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (ignore) {
      return false;
    }
  }

  /**
   * Skip loading AOS (clean screenshots). Enable one of:
   * - URL: ?no-aos=1 or ?screenshot=1
   * - sessionStorage: bbe_disable_aos = "1" (per tab; clear with removeItem + reload)
   * - localStorage: bbe_disable_aos = "1" (persists until cleared)
   * - Optional inline script before init.js: window.BEAN_BOUTIQUE_DISABLE_AOS = true
   */
  function shouldDisableAOS() {
    try {
      if (window.BEAN_BOUTIQUE_DISABLE_AOS === true) {
        return true;
      }
    } catch (ignore) {}
    try {
      var params = new URLSearchParams(window.location.search);
      if (
        params.get("no-aos") === "1" ||
        params.get("screenshot") === "1"
      ) {
        return true;
      }
    } catch (e2) {}
    try {
      if (window.sessionStorage.getItem("bbe_disable_aos") === "1") {
        return true;
      }
    } catch (e3) {}
    try {
      if (window.localStorage.getItem("bbe_disable_aos") === "1") {
        return true;
      }
    } catch (e4) {}
    return false;
  }

  function injectGlobalAOS() {
    if (shouldDisableAOS()) {
      document.documentElement.setAttribute("data-bbe-no-aos", "1");
      document.documentElement.setAttribute("data-bbe-aos-boot", "1");
      return;
    }

    if (document.documentElement.getAttribute("data-bbe-aos-boot") === "1") {
      return;
    }
    document.documentElement.setAttribute("data-bbe-aos-boot", "1");

    if (!document.getElementById("bbe-aos-css")) {
      var link = document.createElement("link");
      link.id = "bbe-aos-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/aos@2.3.4/dist/aos.css";
      document.head.appendChild(link);
    }

    if (document.getElementById("bbe-aos-js")) {
      return;
    }

    function whenDomReady(cb) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cb, { once: true });
      } else {
        cb();
      }
    }

    function waitForAOSExport(cb) {
      var deadline = Date.now() + 8000;
      function tick() {
        if (window.AOS && typeof window.AOS.init === "function") {
          cb();
          return;
        }
        if (Date.now() > deadline) {
          return;
        }
        window.setTimeout(tick, 20);
      }
      tick();
    }

    function runAOSInit() {
      if (!window.AOS || typeof window.AOS.init !== "function") {
        return;
      }

      window.BeanBoutiqueAOS.refresh = function () {
        if (window.AOS) {
          window.AOS.refresh();
        }
      };

      function scheduleHardRefresh() {
        window.BeanBoutiqueAOS.refresh();
      }

      var refreshMs = null;
      function scheduleDebouncedRefresh() {
        window.clearTimeout(refreshMs);
        refreshMs = window.setTimeout(scheduleHardRefresh, 140);
      }

      if (!window.__bbeAOSInitialized) {
        window.__bbeAOSInitialized = true;
        var reduce = prefersReducedMotion();
        window.AOS.init({
          once: false,
          mirror: true,
          duration: reduce ? 0 : 1500,
          easing: "ease-out-cubic",
          offset: 32,
          disable: reduce,
        });
      }

      if (typeof window.MutationObserver !== "undefined" && document.body) {
        var mo = new MutationObserver(scheduleDebouncedRefresh);
        mo.observe(document.body, { childList: true, subtree: true });
      }

      window.addEventListener("load", scheduleHardRefresh, { once: true });

      [0, 50, 200, 500, 1200, 2800].forEach(function (ms) {
        window.setTimeout(scheduleHardRefresh, ms);
      });

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(scheduleHardRefresh);
        });
      } else {
        window.setTimeout(scheduleHardRefresh, 0);
      }
    }

    function bootstrapAfterLibraryLoads() {
      whenDomReady(function () {
        waitForAOSExport(runAOSInit);
      });
    }

    function tryLoadMirror(index) {
      if (index >= AOS_JS_MIRRORS.length) {
        return;
      }
      var prev = document.getElementById("bbe-aos-js");
      if (prev && prev.parentNode) {
        prev.parentNode.removeChild(prev);
      }

      var script = document.createElement("script");
      script.id = "bbe-aos-js";
      script.async = false;
      script.charset = "utf-8";
      script.src = AOS_JS_MIRRORS[index];
      script.onload = function () {
        script.onerror = null;
        bootstrapAfterLibraryLoads();
      };
      script.onerror = function () {
        script.onload = null;
        script.onerror = null;
        tryLoadMirror(index + 1);
      };
      document.head.appendChild(script);
    }

    tryLoadMirror(0);
  }

  canonicalizeDirectoryUrl();

  var path =
    typeof window.location.pathname === "string"
      ? window.location.pathname
      : "";

  if (isSetupPage(path)) {
    injectGlobalAOS();
    return;
  }

  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== "true") {
      window.location.replace(resolvedSetupUrl());
      return;
    }
  } catch (error) {
    window.location.href = resolvedSetupUrl();
    return;
  }

  injectGlobalAOS();
})();
