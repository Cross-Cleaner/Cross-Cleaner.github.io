/**
 * Cross Cleaner — landing page behaviour.
 *
 * A classic script, not a module: browsers refuse to load ES modules from a
 * file:// origin, and this page has to work when index.html is opened straight
 * from disk. Everything here is progressive enhancement — with scripting off,
 * the page still renders every section, and the only losses are the manual
 * theme toggle, the mobile sheet, tab switching and the scroll animations.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "cc-theme";

  /* ── Theme ──────────────────────────────────────────────────────────── */

  /** The theme in effect, accounting for an explicit choice over the OS. */
  function currentTheme() {
    var forced = root.dataset.theme;
    if (forced === "dark" || forced === "light") return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function paintThemeToggle(theme) {
    var button = document.getElementById("theme-toggle");
    var icon = document.getElementById("theme-icon");
    if (!button || !icon) return;

    // The icon shows what a click will switch *to*, not what is active.
    var next = theme === "dark" ? "light" : "dark";
    icon.setAttribute("href", next === "dark" ? "#i-dark_mode" : "#i-light_mode");
    button.setAttribute("aria-label", "Switch to " + next + " theme");
    button.title = "Switch to " + next + " theme";
  }

  function readStoredTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      // Storage can be unavailable (private mode, file:// in some browsers).
      return null;
    }
  }

  function storeTheme(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {
      /* Theme still applies for this page view; it just will not persist. */
    }
  }

  function initTheme() {
    var stored = readStoredTheme();
    if (stored === "dark" || stored === "light") root.dataset.theme = stored;
    paintThemeToggle(currentTheme());

    var button = document.getElementById("theme-toggle");
    if (button) {
      button.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        storeTheme(next);
        paintThemeToggle(next);
      });
    }

    // Follow the OS until the visitor has expressed a preference.
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      if (!readStoredTheme()) paintThemeToggle(currentTheme());
    };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  /* ── Mobile navigation ──────────────────────────────────────────────── */

  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("nav");
    var icon = document.getElementById("nav-icon");
    if (!toggle || !nav) return;

    function setOpen(open) {
      if (open) nav.setAttribute("data-open", "");
      else nav.removeAttribute("data-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (icon) icon.setAttribute("href", open ? "#i-close" : "#i-menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.hasAttribute("data-open"));
    });

    // Following a link has to dismiss the sheet, otherwise the menu sits on
    // top of the section that was just scrolled to.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.hasAttribute("data-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    var wide = window.matchMedia("(min-width: 861px)");
    var onWide = function (event) {
      if (event.matches) setOpen(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ── Download tabs ───────────────────────────────────────────────────── */

  function initTabs() {
    var list = document.querySelector(".tabs");
    if (!list) return;

    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    function panelFor(tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    }

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        // Roving tabindex: only the selected tab is in the tab order.
        tab.setAttribute("tabindex", selected ? "0" : "-1");
        var panel = panelFor(tab);
        if (panel) panel.hidden = !selected;
      });
      if (focus) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(i, false);
      });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
    });

    // Normalise the initial state from the markup rather than assuming index 0.
    var initial = tabs.findIndex(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    });
    select(initial === -1 ? 0 : initial, false);
  }

  /* ── Scroll effects ──────────────────────────────────────────────────── */

  function initScroll() {
    var bar = document.getElementById("app-bar");
    var progress = document.getElementById("scroll-progress");
    var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* Scroll progress + the app bar hairline. */
    var ticking = false;

    function onScroll() {
      var offset = window.scrollY || window.pageYOffset || 0;

      if (bar) {
        if (offset > 8) bar.setAttribute("data-scrolled", "");
        else bar.removeAttribute("data-scrolled");
      }

      if (progress) {
        var scrollable = root.scrollHeight - window.innerHeight;
        var ratio = scrollable > 0 ? Math.min(offset / scrollable, 1) : 0;
        progress.style.setProperty("--progress", ratio.toFixed(4));
        if (offset > 160) progress.setAttribute("data-visible", "");
        else progress.removeAttribute("data-visible");
      }

      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(onScroll);
      },
      { passive: true }
    );
    window.addEventListener("resize", onScroll);
    onScroll();

    /* Scroll entrances.
     *
     * `.js-reveal` on <html> is what actually hides the elements, and it is
     * added here rather than in the stylesheet — so if this file never runs,
     * the content is simply visible. The timeout is the second line of
     * defence: if IntersectionObserver never fires for some element, that
     * element still shows up instead of staying blank. */
    if (reduced.matches || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    root.classList.add("js-reveal");

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    revealables.forEach(function (el) {
      observer.observe(el);
    });

    window.setTimeout(function () {
      root.classList.remove("js-reveal");
      revealables.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }, 3000);
  }

  initTheme();
  initNav();
  initTabs();
  initScroll();
})();