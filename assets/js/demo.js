/**
 * Cross Cleaner — the two interface mockups in #gallery, made live.
 *
 * These are not screenshots: they re-implement the selection model from
 * crates/appcore/src/categories.rs and the cell layout from
 * crates/gui/src/pages/main.rs and crates/tui/src/pages/main.rs, so what you
 * click in the page behaves the way the real program does — including the
 * tristate rules and the mirrored right-hand column in the terminal.
 *
 * Without JavaScript the static markup in index.html already shows both
 * surfaces in their initial state; this module only takes over from there.
 */
(function () {
  "use strict";

  /* ── Data ─────────────────────────────────────────────────────────────
     Names, entry counts and subcategories come from
     crates/database/windows_database.json, and the order is the one
     category_priority() in crates/appcore/src/app.rs produces: the categories
     a user cares about first, everything else alphabetically. */
  var CATEGORIES = [
    { name: "Cache", count: 71, subs: [] },
    { name: "Logs", count: 266, subs: [] },
    { name: "Crashes", count: 24, subs: [] },
    { name: "Documentation", count: 211, subs: ["Licenses", "Change logs", "Signatures", "News"] },
    { name: "Backups", count: 3, subs: [] },
    { name: "LastActivity", count: 11, subs: ["History", "Connected Devices", "Recent Started Apps"] },
    { name: "Accounts", count: 14, subs: [] },
    { name: "Browser", count: 42, subs: ["History", "Cookies", "Passwords"] },
    { name: "Cheats", count: 26, subs: [] },
    { name: "Downloads", count: 1, subs: [] },
    { name: "Game", count: 34, subs: ["Saves", "Settings"] },
    { name: "Images", count: 23, subs: [] },
  ];

  /* The empty string is the "Uncategorized" pseudo-subcategory: every database
     has entries without a sub_category, which is why has_empty is true
     everywhere here. */
  CATEGORIES.forEach(function (cat) {
    cat.hasEmpty = true;
    cat.selected = [];
  });

  var COLUMNS = 2; /* CATEGORY_COLUMNS in crates/appcore/src/app.rs */

  /* The opening state, so the demo starts mid-selection the way the static
     markup does. Note that a leaf category — one with no subcategories — can
     only ever be checked or unchecked: its selected set is just "Uncategorized",
     so there is no third state to show.
       Cache, Documentation, Browser, Downloads  fully selected
       LastActivity                              one of four entries
       everything else                           untouched */
  function seedInitialState() {
    var seed = { Cache: [], Documentation: null, LastActivity: ["History"], Browser: null, Downloads: [] };
    CATEGORIES.forEach(function (cat) {
      if (!(cat.name in seed)) return;
      var value = seed[cat.name];
      if (value === null) {
        cat.selected = cat.subs.slice();
        if (cat.hasEmpty) cat.selected.push("");
      } else if (value.length === 0) {
        cat.selected = cat.hasEmpty ? [""] : [];
      } else {
        cat.selected = value.slice();
      }
    });
  }

  /* ── Selection model, ported from CategoryState ───────────────────────── */

  function isChecked(cat) {
    if (cat.subs.length === 0 && !cat.hasEmpty) return cat.selected.length > 0;
    if (cat.hasEmpty) {
      return cat.selected.length === cat.subs.length + 1 && cat.selected.indexOf("") !== -1;
    }
    return cat.subs.length > 0 && cat.selected.length === cat.subs.length;
  }

  function isIndeterminate(cat) {
    if (cat.subs.length === 0 && !cat.hasEmpty) return false;
    return cat.selected.length > 0 && !isChecked(cat);
  }

  function isUnchecked(cat) {
    return cat.selected.length === 0;
  }

  /** CategoryState::toggle — select everything, or clear it. */
  function toggleCategory(cat) {
    if (isChecked(cat) || isIndeterminate(cat)) {
      cat.selected = [];
      return false;
    }
    cat.selected = cat.subs.slice();
    if (cat.hasEmpty) cat.selected.push("");
    if (cat.subs.length === 0 && !cat.hasEmpty) cat.selected.push("");
    return true;
  }

  /** CategoryState::toggle_sub — flip a single entry. */
  function toggleSub(cat, sub) {
    var at = cat.selected.indexOf(sub);
    if (at === -1) {
      cat.selected.push(sub);
      return true;
    }
    cat.selected.splice(at, 1);
    return false;
  }

  function selectedCount() {
    return CATEGORIES.filter(function (c) {
      return !isUnchecked(c);
    }).length;
  }

  /** "Cache (71)" — the label AppState::category_label builds. */
  function label(cat) {
    return cat.name + " (" + cat.count + ")";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** The hamburger from the icon sprite, for a subcategory button. */
  function menuIcon() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "gmenu");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-menu");
    svg.appendChild(use);
    return svg;
  }

  /* ── Window app mock ──────────────────────────────────────────────────── */

  var guiPop = document.getElementById("gui-pop");
  var guiPopIndex = -1;

  /** Checkbox state as the app paints it: on, partial, or empty. */
  function checkboxClass(cat) {
    if (isChecked(cat)) return "gchk is-on";
    if (isIndeterminate(cat)) return "gchk is-part";
    return "gchk";
  }

  /** A subcategory is only ever on or off, never partial. */
  function subCheckboxClass(on) {
    return on ? "gchk is-on" : "gchk";
  }

  function renderGui() {
    var left = document.getElementById("gui-left");
    var right = document.getElementById("gui-right");
    if (!left || !right) return;

    left.textContent = "";
    right.textContent = "";

    CATEGORIES.forEach(function (cat, index) {
      // The rightmost column is laid out right-to-left, so its checkbox sits
      // against the window edge and the menu button comes before it.
      var rightmost = index % COLUMNS === COLUMNS - 1;

      var cell = el("button", "gcell");
      cell.type = "button";
      cell.dataset.index = String(index);
      cell.setAttribute(
        "aria-pressed",
        isChecked(cat) ? "true" : isIndeterminate(cat) ? "mixed" : "false",
      );
      if (isChecked(cat)) cell.classList.add("is-on");

      var box = el("i", checkboxClass(cat));
      box.setAttribute("aria-hidden", "true");

      // The checkbox widget in egui carries its own label, and the menu button
      // is added after it — so in the rightmost column, which is laid out
      // right-to-left, the button lands on the far side of the row. Both
      // orders end up with the button on the outside, which is what
      // category_menu_button() does with its `mirrored` flag.
      var menu = null;
      if (cat.subs.length > 0) {
        menu = el("i", "gmenu-btn");
        menu.appendChild(menuIcon());
        menu.setAttribute("role", "button");
        menu.tabIndex = 0;
        menu.setAttribute("aria-label", "Subcategories of " + cat.name);
        menu.dataset.submenu = String(index);
      }

      if (rightmost && menu) cell.appendChild(menu);
      cell.appendChild(box);
      cell.appendChild(el("span", null, label(cat)));
      if (!rightmost && menu) cell.appendChild(menu);

      cell.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-submenu]");
        if (trigger) {
          // Keep the document listener from treating this very click as an
          // outside click and closing the popup as it opens.
          event.stopPropagation();
          var index = Number(trigger.dataset.submenu);
          // Same button again closes it, the way egui's popup behaves.
          if (guiPopIndex === index) closeGuiPop(trigger);
          else openGuiPop(index, trigger);
          return;
        }
        toggleCategory(cat);
        renderAll();
      });

      (rightmost ? right : left).appendChild(cell);
    });
  }

  function openGuiPop(index, anchor) {
    var cat = CATEGORIES[index];
    if (!cat || !guiPop) return;

    guiPopIndex = index;
    guiPop.textContent = "";
    guiPop.appendChild(el("h4", null, cat.name));

    var list = el("ul");
    // "Uncategorized" always comes last, the way AppState::sub_label orders it.
    var entries = cat.subs.concat(cat.hasEmpty ? [""] : []);
    entries.forEach(function (sub) {
      var li = el("li");
      var button = el("button");
      button.type = "button";
      button.appendChild(el("i", subCheckboxClass(cat.selected.indexOf(sub) !== -1)));
      button.appendChild(el("span", null, sub === "" ? "Uncategorized" : sub));
      button.appendChild(el("span", "gcount", cat.count + " entries"));
      button.addEventListener("click", function () {
        toggleSub(cat, sub);
        renderAll();
      });
      li.appendChild(button);
      list.appendChild(li);
    });

    guiPop.appendChild(list);
    guiPop.hidden = false;
    positionGuiPop(anchor);
    var first = guiPop.querySelector("button");
    if (first) first.focus();
  }

  /** Places the popup beside the button that opened it, the way
      egui::Popup::menu does, and flips it inwards if it would leave the card. */
  function positionGuiPop(anchor) {
    if (!guiPop || guiPop.hidden) return;

    var host = guiPop.parentElement;
    if (!host) return;

    var anchorBox = anchor.getBoundingClientRect();
    var hostBox = host.getBoundingClientRect();
    var popBox = guiPop.getBoundingClientRect();

    var left = anchorBox.left - hostBox.left + anchorBox.width + 6;
    // Flip to the other side when the popup would stick out of the card.
    if (left + popBox.width > hostBox.width) {
      left = anchorBox.left - hostBox.left - popBox.width - 6;
    }
    var top = anchorBox.top - hostBox.top - 4;
    // Keep it inside the bottom of the card.
    top = Math.max(0, Math.min(top, hostBox.height - popBox.height));

    guiPop.style.left = Math.round(left) + "px";
    guiPop.style.top = Math.round(top) + "px";
  }

  function closeGuiPop() {
    guiPopIndex = -1;
    if (guiPop) {
      guiPop.hidden = true;
      guiPop.textContent = "";
    }
  }

  /* ── Terminal app mock ────────────────────────────────────────────────── */

  var tuiFrame = document.getElementById("tui-frame");
  var tuiGrid = document.getElementById("tui-grid");
  var tuiCount = document.getElementById("tui-count");
  var tuiPop = document.getElementById("tui-pop");
  var cursor = 0;
  var tuiPopIndex = -1;

  /** Theme::checkbox. */
  function tuiCheck(cat) {
    if (isChecked(cat)) return ["[x]", "t-on"];
    if (isIndeterminate(cat)) return ["[-]", "t-warn"];
    return ["[ ]", "t-dim"];
  }

  /** sub_hint_style: accent while something is selected, dim at zero. */
  function hintClass(cat) {
    return cat.selected.length > 0 ? "t-acc" : "t-dim";
  }

  function renderTui() {
    if (!tuiGrid) return;

    tuiGrid.textContent = "";
    CATEGORIES.forEach(function (cat, index) {
      var right = index % COLUMNS === COLUMNS - 1;
      var cell = el("span");
      cell.dataset.index = String(index);
      if (index === cursor) cell.className = "is-focus";

      var check = tuiCheck(cat);
      var hintCount = cat.selected.length;
      // Written by cell_spans(): marker, checkbox, label, hint — then the exact
      // mirror for the right-hand column, so the checkbox lands on the right
      // edge and the hint moves in front of the label.
      if (!right) {
        cell.appendChild(el("i", check[1], check[0]));
        cell.appendChild(el("span", null, label(cat)));
        if (cat.subs.length) {
          cell.appendChild(el("span", hintClass(cat), "  \u2192 " + hintCount));
        }
      } else {
        if (cat.subs.length) {
          cell.appendChild(el("span", hintClass(cat), hintCount + " \u2190  "));
        }
        cell.appendChild(el("span", null, label(cat)));
        cell.appendChild(el("i", check[1], check[0]));
      }

      cell.title = label(cat) + " — click, or use the arrow keys";
      cell.addEventListener("click", function () {
        cursor = index;
        toggleCategory(cat);
        renderAll();
      });

      tuiGrid.appendChild(cell);
    });

    if (tuiCount) {
      tuiCount.textContent = "Categories (" + selectedCount() + "/" + CATEGORIES.length + " selected)";
    }
  }

  function openTuiPop(index) {
    var cat = CATEGORIES[index];
    if (!cat || !tuiPop) return;

    tuiPopIndex = index;
    tuiPop.textContent = "";
    tuiPop.appendChild(el("div", "term__pop-title t-dim", cat.name + " subcategories"));

    var list = el("div", "term__pop-list");
    var entries = cat.subs.concat(cat.hasEmpty ? [""] : []);
    entries.forEach(function (sub) {
      var on = cat.selected.indexOf(sub) !== -1;
      var button = el("button");
      button.type = "button";
      button.appendChild(el("i", on ? "t-on" : "t-dim", on ? "[x]" : "[ ]"));
      button.appendChild(el("span", null, sub === "" ? "Uncategorized" : sub));
      button.addEventListener("click", function () {
        toggleSub(cat, sub);
        renderAll();
      });
      list.appendChild(button);
    });
    tuiPop.appendChild(list);

    var foot = el("div", "term__pop-foot");
    foot.appendChild(el("span", null, "\u2191\u2193 move \u00b7 space toggle \u00b7 esc close"));
    tuiPop.appendChild(foot);
    tuiPop.hidden = false;
    tuiPop.querySelector("button")?.focus();
  }

  function closeTuiPop() {
    tuiPopIndex = -1;
    if (tuiPop) {
      tuiPop.hidden = true;
      tuiPop.textContent = "";
    }
  }

  /** Move the cursor the way the app does: Up/Down jump a whole row. */
  function moveCursor(delta) {
    var next = cursor + delta;
    if (next < 0 || next >= CATEGORIES.length) return;
    cursor = next;
    renderTui();
    var cell = tuiGrid.querySelector('[data-index="' + cursor + '"]');
    if (cell) cell.scrollIntoView({ block: "nearest" });
  }

  function initTuiKeys() {
    if (!tuiFrame) return;

    tuiFrame.addEventListener("keydown", function (event) {
      if (tuiPopIndex !== -1 && event.key === "Escape") {
        closeTuiPop();
        tuiFrame.focus();
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          moveCursor(-COLUMNS);
          break;
        case "ArrowDown":
          moveCursor(COLUMNS);
          break;
        case "ArrowLeft":
          moveCursor(-1);
          break;
        case "ArrowRight":
          moveCursor(1);
          break;
        case "Tab":
          moveCursor(event.shiftKey ? -1 : 1);
          break;
        case " ":
        case "Spacebar":
          toggleCategory(CATEGORIES[cursor]);
          renderAll();
          break;
        case "Enter":
          // Categories without subcategories have nothing to open, matching
          // the real binding, which only acts when there are entries.
          if (CATEGORIES[cursor].subs.length) openTuiPop(cursor);
          else toggleCategory(CATEGORIES[cursor]);
          renderTui();
          break;
        default:
          return;
      }
      event.preventDefault();
    });

    // Clicking inside the terminal focuses it, so the keys work right away.
    tuiFrame.addEventListener("mousedown", function () {
      tuiFrame.focus();
    });
  }

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  function renderAll() {
    renderGui();
    renderTui();
    // A popup shows a category's entries, so it has to follow a toggle. The
    // cell that opened it was just replaced, so re-anchor to its new node.
    if (guiPopIndex !== -1) {
      var anchor = document.querySelector('[data-submenu="' + guiPopIndex + '"]');
      openGuiPop(guiPopIndex, anchor);
    }
  }

  document.addEventListener("click", function (event) {
    if (guiPop && guiPopIndex !== -1 && !event.target.closest("#gui-pop") && !event.target.closest("[data-submenu]")) {
      closeGuiPop();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && guiPopIndex !== -1) {
      var trigger = document.querySelector('[data-submenu="' + guiPopIndex + '"]');
      closeGuiPop();
      if (trigger) trigger.focus();
    }
  });

  // Keep the popup glued to its button when the card moves or resizes.
  window.addEventListener("resize", function () {
    if (guiPopIndex !== -1) {
      positionGuiPop(document.querySelector('[data-submenu="' + guiPopIndex + '"]'));
    }
  });

  seedInitialState();
  renderAll();
  initTuiKeys();
})();