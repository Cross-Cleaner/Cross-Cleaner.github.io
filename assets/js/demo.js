/**
 * Cross Cleaner — the two interface mockups in #gallery, made live.
 *
 * These are not screenshots: they re-implement the selection model from
 * crates/appcore/src/categories.rs and the cell layout from
 * crates/gui/src/pages/main.rs and crates/tui/src/pages/main.rs, so what you
 * click in the page behaves the way the real program does — including the
 * tristate rules, the mirrored right-hand column in the terminal, and the
 * centred subcategory overlay from crates/tui/src/app.rs.
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
  /* `subs` holds [name, entryCount] pairs, because AppState::sub_label renders
     the count inside the label ("Licenses (96)") and both frontends use that
     one label. `uncat` is the count for the "Uncategorized" pseudo-entry, i.e.
     the entries that have no sub_category at all. */
  var CATEGORIES = [
    { name: "Cache", count: 71, subs: [] },
    { name: "Logs", count: 266, subs: [] },
    { name: "Crashes", count: 24, subs: [] },
    {
      name: "Documentation", count: 211, uncat: 92,
      subs: [["Licenses", 96], ["Change logs", 10], ["Signatures", 9], ["News", 3], ["Examples", 1]],
    },
    { name: "Backups", count: 3, subs: [] },
    {
      name: "LastActivity", count: 11, uncat: 1,
      subs: [["History", 7], ["Connected Devices", 1], ["Recent Started Apps", 1], ["Conversations", 1]],
    },
    { name: "Accounts", count: 14, subs: [] },
    {
      name: "Browser", count: 42, uncat: 0,
      subs: [["History", 16], ["Cookies", 15], ["Passwords", 11]],
    },
    { name: "Cheats", count: 26, subs: [] },
    { name: "Downloads", count: 1, subs: [] },
    {
      name: "Game", count: 34, uncat: 0,
      subs: [["Saves", 24], ["Settings", 10]],
    },
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
       LastActivity                                  one entry of four
       everything else                               untouched */
  function seedInitialState() {
    var seed = { Cache: [], Documentation: null, LastActivity: ["History"], Browser: null, Downloads: [] };
    CATEGORIES.forEach(function (cat) {
      if (!(cat.name in seed)) return;
      var value = seed[cat.name];
      if (value === null) {
        cat.selected = subNames(cat);
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
    cat.selected = subNames(cat);
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

  /** Subcategory list of a category, with "Uncategorized" last. */
  function entriesOf(cat) {
    return cat.subs.map(function (pair) {
      return [pair[0], pair[1]];
    }).concat(cat.hasEmpty ? [["", cat.uncat || 0]] : []);
  }

  /** Names only, which is what the selected set holds. */
  function subNames(cat) {
    return cat.subs.map(function (pair) {
      return pair[0];
    });
  }

  /** AppState::sub_label — the name with its entry count, e.g. "Licenses (96)". */
  function subLabel(name, count) {
    return (name === "" ? "Uncategorized" : name) + " (" + count + ")";
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
      // right-to-left, the button lands on the far side of the row. Both orders
      // end up with the button on the outside, which is what
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
    entriesOf(cat).forEach(function (entry) {
      var li = el("li");
      var button = el("button");
      button.type = "button";
      button.appendChild(el("i", subCheckboxClass(cat.selected.indexOf(entry[0]) !== -1)));
      // sub_label() puts the entry count inside the label, so there is no
      // separate count column.
      button.appendChild(el("span", null, subLabel(entry[0], entry[1])));
      button.addEventListener("click", function () {
        toggleSub(cat, entry[0]);
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
    if (!guiPop || guiPop.hidden || !anchor) return;

    var host = guiPop.parentElement;
    if (!host) return;

    var anchorBox = anchor.getBoundingClientRect();
    var hostBox = host.getBoundingClientRect();
    var popBox = guiPop.getBoundingClientRect();

    var left = anchorBox.left - hostBox.left + anchorBox.width + 6;
    if (left + popBox.width > hostBox.width) {
      left = anchorBox.left - hostBox.left - popBox.width - 6;
    }
    var top = anchorBox.top - hostBox.top - 4;
    top = Math.max(0, Math.min(top, hostBox.height - popBox.height));

    guiPop.style.left = Math.round(left) + "px";
    guiPop.style.top = Math.round(top) + "px";
  }

  function closeGuiPop(refocus) {
    guiPopIndex = -1;
    if (guiPop) {
      guiPop.hidden = true;
      guiPop.textContent = "";
    }
    if (refocus && refocus.focus) refocus.focus();
  }

  /* ── Terminal app mock ────────────────────────────────────────────────── */

  var tuiFrame = document.getElementById("tui-frame");
  var tuiGrid = document.getElementById("tui-grid");
  var tuiCount = document.getElementById("tui-count");
  var tuiPop = document.getElementById("tui-pop");
  var cursor = 0;
  var tuiPopIndex = -1;
  var tuiPopCursor = 0;

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
          cell.appendChild(el("span", hintClass(cat), "  → " + hintCount));
        }
      } else {
        if (cat.subs.length) {
          cell.appendChild(el("span", hintClass(cat), hintCount + " ←  "));
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

  /** Opens the overlay for `index`, the way `enter subs` does. */
  function openTuiPop(index) {
    if (!CATEGORIES[index] || !tuiPop) return;
    tuiPopIndex = index;
    tuiPopCursor = 0;
    renderTuiPop();
  }

  /* The overlay from render_popup() in crates/tui/src/app.rs: centred over the
     screen, a block with the focused (accent) border, checkable rows with a
     highlighted cursor, and the key hints sitting on the bottom border rather
     than below it. */
  function renderTuiPop() {
    var cat = CATEGORIES[tuiPopIndex];
    if (!cat || !tuiPop) return;

    tuiPop.textContent = "";
    tuiPop.appendChild(el("div", "term__pop-title", cat.name));

    var list = el("div", "term__pop-list");
    entriesOf(cat).forEach(function (entry, i) {
      var on = cat.selected.indexOf(entry[0]) !== -1;
      var row = el("button", "term__pop-row" + (i === tuiPopCursor ? " is-focus" : ""));
      row.type = "button";
      row.appendChild(el("i", on ? "t-on" : "t-dim", on ? "[x]" : "[ ]"));
      // Same sub_label() the window frontend uses: name and entry count together.
      row.appendChild(el("span", null, subLabel(entry[0], entry[1])));
      row.addEventListener("click", function () {
        tuiPopCursor = i;
        toggleSub(cat, entry[0]);
        renderAll();
      });
      list.appendChild(row);
    });
    tuiPop.appendChild(list);
    tuiPop.appendChild(el("div", "term__pop-foot", "↑↓ move · space toggle · esc close"));
    tuiPop.hidden = false;
  }

  function closeTuiPop() {
    tuiPopIndex = -1;
    tuiPopCursor = 0;
    if (tuiPop) {
      tuiPop.hidden = true;
      tuiPop.textContent = "";
    }
  }

  /** movePopCursor, mirroring move_index(): it wraps with rem_euclid. */
  function movePopCursor(delta) {
    var cat = CATEGORIES[tuiPopIndex];
    if (!cat) return;
    var count = entriesOf(cat).length;
    if (count === 0) return;
    tuiPopCursor = ((tuiPopCursor + delta) % count + count) % count;
    renderTuiPop();
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

  /* Key bindings, following footer_hints() in crates/tui/src/app.rs:
       ↑↓ row   · tab column   · space select   · enter subs
     The sideways arrows are bound to the overlay as well, which is the `→ cats`
     convention the program page already uses. */
  function initTuiKeys() {
    if (!tuiFrame) return;

    tuiFrame.addEventListener("keydown", function (event) {
      // While the overlay is up it owns the arrow keys and space.
      if (tuiPopIndex !== -1) {
        switch (event.key) {
          case "ArrowUp":
            movePopCursor(-1);
            break;
          case "ArrowDown":
            movePopCursor(1);
            break;
          case " ":
          case "Spacebar": {
            var cat = CATEGORIES[tuiPopIndex];
            var entries = entriesOf(cat);
            if (entries[tuiPopCursor] !== undefined) toggleSub(cat, entries[tuiPopCursor][0]);
            renderAll();
            break;
          }
          case "Escape":
          case "Enter":
            closeTuiPop();
            break;
          default:
            return;
        }
        event.preventDefault();
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
        case "ArrowRight": {
          // Only categories that actually have entries have something to show;
          // the arrow then just moves the cursor, as on the program page.
          if (CATEGORIES[cursor].subs.length > 0) openTuiPop(cursor);
          else moveCursor(event.key === "ArrowRight" ? 1 : -1);
          break;
        }
        case "Tab":
          moveCursor(event.shiftKey ? -1 : 1);
          break;
        case " ":
        case "Spacebar":
          toggleCategory(CATEGORIES[cursor]);
          renderAll();
          break;
        case "Enter":
          if (CATEGORIES[cursor].subs.length > 0) openTuiPop(cursor);
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
      openGuiPop(guiPopIndex, document.querySelector('[data-submenu="' + guiPopIndex + '"]'));
    }
    if (tuiPopIndex !== -1) renderTuiPop();
  }

  document.addEventListener("click", function (event) {
    if (guiPop && guiPopIndex !== -1 && !event.target.closest("#gui-pop") && !event.target.closest("[data-submenu]")) {
      closeGuiPop();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && guiPopIndex !== -1) {
      var trigger = document.querySelector('[data-submenu="' + guiPopIndex + '"]');
      closeGuiPop(trigger);
    }
  });

  /* A click inside the popup must not reach the closer above.
   *
   * Ticking an entry rebuilds the list, which detaches the very node that was
   * clicked. A detached target has no ancestor chain left, so the closer's
   * `closest("#gui-pop")` returns null and the popup would shut the moment you
   * ticked a box. Stopping propagation on the popup container is the only
   * reliable signal that a click was inside it. Registered once, here, rather
   * than in openGuiPop, so it cannot accumulate duplicates. */
  if (guiPop) {
    guiPop.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

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