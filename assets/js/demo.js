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

  /* Programs per (category, subcategory), taken from
     crates/database/windows_database.json and capped at eight per entry so the
     page stays light. build_program_list() walks the database and keeps an
     entry when its category *and* its subcategory are both selected, so this
     table is what decides the program list. */
  var PROGRAMS = {
    Cache: { "": ["Albion Online", "ATLauncher", "Badlion Client", "Brave Browser", "CollapseLoader", "CurseForge", "Cursor", "DeepL"] },
    Logs: { "": ["1Password", "4uKey for Android", "Amnezia VPN", "Anaconda", "AnarchyLoader", "Atom", "Audacity", "Avast"] },
    Crashes: { "": ["Arizona Games Launcher", "ATLauncher", "Badlion Client", "Cristalix", "CurseForge", "Discord", "Genshin Impact", "GribLand"] },
    Documentation: {
      "": ["7-Zip", "Adobe", "AltSnap", "ASIO4ALL v2", "Bulk Crap Uninstaller", "Cheat Engine", "Everything", "FreeCAD"],
      "Change logs": ["BoxedAppPacker", "Cursor", "Enigma Virtual Box", "Everything", "HomeBank", "Notepad++", "Process Hacker 2"],
      "Examples": ["FreeCAD"],
      "Licenses": ["7-Zip", "AltSnap", "Amnezia VPN", "Anaconda", "ATLauncher", "Audacity", "Avast", "Badlion Client"],
      "News": ["InkSpace", "Salwyrr Launcher", "VLC"],
      "Signatures": ["Mem Reduct", "MinGW", "Process Hacker 2", "Steam", "SystemInformer"],
    },
    Backups: { "": ["Namida", "ShareX", "Windhawk"] },
    LastActivity: {
      "": ["Everything", "Flow Launcher", "Namida", "rgitui", "Windows", "Windows PowerShell"],
      "Connected Devices": ["Windows"],
      "Conversations": ["OpenCode"],
      "History": ["Everything", "Flow Launcher", "Namida", "rgitui", "Windows", "Windows PowerShell"],
      "Recent Started Apps": ["Windows"],
    },
    Accounts: { "": ["ATLauncher", "Badlion Client", "CollapseLoader", "CurseForge", "GribLand", "Lunar Client", "Modrinth", "MultiMC"] },
    Browser: {
      "": ["Brave Browser", "Google Chrome", "Helium Browser", "LibreWolf", "Microsoft Edge", "Mozilla Firefox", "Opera"],
      "Cookies": ["Brave Browser", "Google Chrome", "Helium Browser", "LibreWolf", "Microsoft Edge", "Mozilla Firefox", "Opera"],
      "History": ["Brave Browser", "Google Chrome", "Helium Browser", "LibreWolf", "Microsoft Edge", "Mozilla Firefox", "Opera"],
      "Passwords": ["Brave Browser", "Google Chrome", "Helium Browser", "Opera", "Opera GX", "Thorium"],
    },
    Cheats: { "": ["AnarchyLoader", "ATLauncher", "Badlion Client", "Cheat Engine", "CollapseLoader", "CurseForge", "ExecHack", "Fatality"] },
    Downloads: { "": ["Windows"] },
    Game: {
      "": ["ATLauncher", "Badlion Client", "Borderlands 2", "Cossacks 3", "Cristalix", "CurseForge", "GribLand"],
      "Saves": ["ATLauncher", "Badlion Client", "Borderlands 2", "Cossacks 3", "Cristalix", "CubixWorld", "CurseForge", "GribLand"],
      "Settings": ["Borderlands 2", "Cossacks 3", "Counter-Strike Global Offensive", "Dota 2", "Rust", "Terraria", "Unturned", "Void Train"],
    },
    Images: { "": ["Arizona Games Launcher", "ATLauncher", "Badlion Client", "BlueStacks 5", "Cristalix", "CurseForge", "GribLand", "GTA San Andreas"] },
  };

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

  /* ── Program list ──────────────────────────────────────────────────────
     build_program_list() in crates/appcore/src/app.rs: every database entry
     whose category *and* subcategory are selected contributes its program, a
     program seen under several categories is merged into one row, and the list
     is sorted by name with programs checked by default. Returns false when
     nothing is selected, which is what makes `Next` do nothing. */

  function hasSelection() {
    return CATEGORIES.some(function (cat) {
      return !isUnchecked(cat);
    });
  }

  function buildProgramList() {
    if (!hasSelection()) return [];

    var byName = {};
    CATEGORIES.forEach(function (cat) {
      if (isUnchecked(cat)) return;
      var table = PROGRAMS[cat.name] || {};
      entriesOf(cat).forEach(function (entry) {
        // Only the selected subcategories contribute.
        if (cat.selected.indexOf(entry[0]) === -1) return;
        (table[entry[0]] || []).forEach(function (program) {
          if (!byName[program]) byName[program] = [];
          if (byName[program].indexOf(cat.name) === -1) byName[program].push(cat.name);
        });
      });
    });

    return Object.keys(byName)
      .sort()
      .map(function (name) {
        return {
          name: name,
          categories: byName[name].sort(),
          // Program checkboxes start checked; `disabled` are the categories the
          // user turned off for this one program.
          disabled: [],
        };
      });
  }

  /** ProgramState::is_program_checked — off only when every category is off. */
  function programChecked(program) {
    return program.disabled.length === 0;
  }

  /** ProgramState::is_program_indeterminate — some but not all categories off. */
  function programIndeterminate(program) {
    return program.disabled.length > 0 && program.disabled.length < program.categories.length;
  }

  function toggleProgram(program) {
    if (programChecked(program) || programIndeterminate(program)) {
      program.disabled = program.categories.slice();
      return false;
    }
    program.disabled = [];
    return true;
  }

  /** The rows the search leaves visible, matching AppState::set_search. */
  function filterPrograms(list, query) {
    if (!query) return list;
    var needle = query.toLowerCase();
    return list.filter(function (p) {
      return p.name.toLowerCase().indexOf(needle) !== -1;
    });
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
  /* Page state, mirroring AppState::current_page. */
  var guiPage = "categories";
  var tuiPage = "categories";
  var programs = [];
  var guiSearch = "";
  var tuiSearch = "";
  var tuiSearchEditing = false;
  var tuiProgramCursor = 0;
  var toast = null;

  function setPage(which, page) {
    if (which === "gui") guiPage = page;
    else tuiPage = page;
    // Leaving the program page drops the list, the way the real app rebuilds it
    // from the category selection every time `Next` is pressed.
    if (page === "categories") {
      guiSearch = "";
      tuiSearch = "";
      tuiSearchEditing = false;
      tuiProgramCursor = 0;
      programs = [];
    }
  }

  /** Transient status line, which replaces the footer's key hints. */
  function showToast(message, kind) {
    toast = { message: message, kind: kind || "warn", until: Date.now() + 2500 };
    // Nothing else would re-render afterwards, so drop it on a timer.
    window.setTimeout(function () {
      if (toast && Date.now() >= toast.until) {
        toast = null;
        renderChrome();
      }
    }, 2600);
  }

  /* ── Next / Start Cleaning ─────────────────────────────────────────────
     `Next` is build_program_list(): it returns false with nothing selected, and
     the terminal app answers that with a toast rather than changing page. */

  function goToPrograms() {
    var list = buildProgramList();
    if (!list.length) {
      showToast("Select at least one category first.");
      renderAll();
      return false;
    }
    programs = list;
    return true;
  }

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

  function renderGuiCategories() {
    var body = document.getElementById("gui-body");
    var head = document.getElementById("gui-head");
    if (!body) return;

    // The pages take turns over the same containers, so each one rebuilds what
    // it needs instead of relying on markup that may have been thrown away by
    // the other page.
    head.textContent = "";
    body.textContent = "";

    var cols = el("div", "win__cols");
    var left = el("div", "win__col");
    var right = el("div", "win__col win__col--rtl");
    // Keep the ids the static markup had, so anything reaching for the columns
    // still finds them after a page switch.
    cols.id = "gui-cols";
    left.id = "gui-left";
    right.id = "gui-right";
    cols.appendChild(left);
    cols.appendChild(right);
    body.appendChild(cols);

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

  /** The window app's program page: crates/gui/src/pages/program_selection.rs —
      centred heading, a search field, two columns of program checkboxes and a
      pinned "Start Cleaning" button. */
  function renderGuiPrograms() {
    var body = document.getElementById("gui-body");
    var head = document.getElementById("gui-head");
    if (!body) return;

    // The heading, separator and search sit above the scrolling list, so they
    // go in the fixed header; only the checkbox list scrolls below it.
    head.textContent = "";
    head.appendChild(el("h4", "gui-heading", "Select Programs to Clean"));
    head.appendChild(el("hr", "gui-sep"));
    body.textContent = "";

    var search = el("div", "gui-search");
    search.appendChild(el("label", null, "Search:"));
    var input = el("input", "gui-search__field");
    input.type = "search";
    input.value = guiSearch;
    input.placeholder = "";
    input.setAttribute("aria-label", "Search programs");
    input.addEventListener("input", function () {
      guiSearch = input.value;
      renderGuiPrograms();
      var again = document.querySelector(".gui-search__field");
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    });
    search.appendChild(input);
    head.appendChild(search);

    var shown = filterPrograms(programs, guiSearch);
    var list = el("div", "gui-list");
    if (shown.length === 0) {
      list.appendChild(el("p", "gui-empty", guiSearch ? "No program matches the search." : "No programs for the selected categories."));
      body.appendChild(list);
      return;
    }

    var colA = el("div", "gui-list__col");
    var colB = el("div", "gui-list__col gui-list__col--rtl");
    shown.forEach(function (program, i) {
      // Same right-to-left trick as the category grid.
      var rightmost = i % COLUMNS === COLUMNS - 1;
      var cell = el("button", "gcell");
      cell.type = "button";
      cell.setAttribute("aria-pressed", programChecked(program) ? "true" : programIndeterminate(program) ? "mixed" : "false");

      var menu = null;
      // Only programs in several categories get the overlay marker.
      if (program.categories.length > 1) {
        menu = el("i", "gmenu-btn");
        menu.appendChild(menuIcon());
        menu.setAttribute("role", "button");
        menu.tabIndex = 0;
        menu.setAttribute("aria-label", "Categories of " + program.name);
      }

      if (rightmost && menu) cell.appendChild(menu);
      cell.appendChild(el("i", programChecked(program) ? "gchk is-on" : programIndeterminate(program) ? "gchk is-part" : "gchk"));
      cell.appendChild(el("span", null, program.name));
      if (!rightmost && menu) cell.appendChild(menu);

      cell.addEventListener("click", function () {
        toggleProgram(program);
        renderGuiPrograms();
      });
      (rightmost ? colB : colA).appendChild(cell);
    });

    list.appendChild(colA);
    list.appendChild(colB);
    body.appendChild(list);
  }

  /** Draws whichever page the window mock is on. */
  function renderGui() {
    if (guiPage === "programs") renderGuiPrograms();
    else renderGuiCategories();
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

  function renderTuiCategories() {
    if (!tuiGrid) return;

    // The program page switches this container to `term__list`; it has to be
    // restored, or the category grid keeps the wrong styling.
    tuiGrid.className = "term__grid";
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

  /** The terminal app's program page: crates/tui/src/pages/program_selection.rs
      — a search field, a "Programs (n/m shown)" block and a pinned
      "Start Cleaning" button. */
  function renderTuiPrograms() {
    if (!tuiGrid) return;

    var shown = filterPrograms(programs, tuiSearch);

    tuiGrid.textContent = "";
    tuiGrid.className = "term__list";

    // Search field: the query, a caret while editing, and the page's hints.
    var search = el("div", "term__search");
    search.appendChild(el("b", "t-dim", " Search: "));
    if (tuiSearch) search.appendChild(el("span", null, tuiSearch));
    else search.appendChild(el("span", "t-dim", "type a program name…"));
    search.appendChild(el("span", "t-caret", tuiSearchEditing ? "▏" : "  "));
    search.appendChild(el("span", "t-dim", tuiSearchEditing ? "  esc/enter done · backspace delete" : "  / to search · u to clear"));
    tuiGrid.appendChild(search);

    if (shown.length === 0) {
      // empty_hint() explains an empty list instead of drawing a blank box.
      tuiGrid.appendChild(el("p", "term__empty t-dim", tuiSearch ? "No program matches the search." : "No programs for the selected categories."));
      return;
    }

    shown.forEach(function (program, i) {
      var row = el("div", "term__row" + (i === tuiProgramCursor ? " is-focus" : ""));
      row.setAttribute("data-program", program.name);
      var mark = programChecked(program) ? "[x]" : programIndeterminate(program) ? "[-]" : "[ ]";
      var tone = programChecked(program) ? "t-on" : programIndeterminate(program) ? "t-warn" : "t-dim";
      row.appendChild(el("i", tone, mark));
      row.appendChild(el("span", null, " " + program.name));
      // Only programs in several categories carry the arrow, as program_items()
      // does; it turns warn-coloured once a category is excluded.
      if (program.categories.length > 1) {
        row.appendChild(el("span", program.disabled.length ? "t-warn" : "t-dim", "  → " + program.categories.length));
      }
      row.addEventListener("click", function () {
        tuiProgramCursor = i;
        toggleProgram(program);
        renderTuiPrograms();
      });
      tuiGrid.appendChild(row);
    });
  }

  /** Draws whichever page the terminal mock is on. */
  function renderTui() {
    if (tuiPage === "programs") renderTuiPrograms();
    else renderTuiCategories();
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

  /** move_list() on the program page: wraps at both ends. */
  function moveProgramCursor(delta) {
    var shown = filterPrograms(programs, tuiSearch);
    if (shown.length === 0) return;
    tuiProgramCursor = ((tuiProgramCursor + delta) % shown.length + shown.length) % shown.length;
    renderTuiPrograms();
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

      /* While the search field is focused, printable characters go into the query
       and the single-letter bindings stay out of the way — the app's own hint
       reads "/ to search · u to clear", and clearing only applies once the field
       has been released. */
      if (tuiPage === "programs" && tuiSearchEditing && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        tuiSearch += event.key;
        renderTui();
        event.preventDefault();
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          if (tuiPage === "programs") moveProgramCursor(-1);
          else moveCursor(-COLUMNS);
          break;
        case "ArrowDown":
          if (tuiPage === "programs") moveProgramCursor(1);
          else moveCursor(COLUMNS);
          break;
        case "ArrowLeft":
        case "ArrowRight": {
          if (tuiPage === "programs") break;
          // Only categories that actually have entries have something to show;
          // the arrow then just moves the cursor, as on the program page.
          if (CATEGORIES[cursor].subs.length > 0) openTuiPop(cursor);
          else moveCursor(event.key === "ArrowRight" ? 1 : -1);
          break;
        }
        case "Tab":
          if (tuiPage === "categories") moveCursor(event.shiftKey ? -1 : 1);
          break;
        case " ":
        case "Spacebar":
          if (tuiPage === "programs") {
            var shown = filterPrograms(programs, tuiSearch);
            if (shown[tuiProgramCursor]) toggleProgram(shown[tuiProgramCursor]);
          } else {
            toggleCategory(CATEGORIES[cursor]);
          }
          renderAll();
          break;
        case "Enter":
          if (tuiPage === "categories") {
            if (CATEGORIES[cursor].subs.length > 0) openTuiPop(cursor);
            else toggleCategory(CATEGORIES[cursor]);
            renderTui();
          } else if (tuiSearchEditing) {
            tuiSearchEditing = false;
            renderTui();
          }
          break;
        case "Escape":
          // esc back, and esc also leaves search editing first.
          if (tuiSearchEditing) {
            tuiSearchEditing = false;
            renderTui();
          } else if (tuiPage === "programs") {
            setPage("tui", "categories");
            renderAll();
          }
          break;
        case "Backspace":
          if (tuiPage === "programs" && tuiSearchEditing && tuiSearch.length) {
            tuiSearch = tuiSearch.slice(0, -1);
            renderTui();
            break;
          }
          return;
        case "/":
          if (tuiPage === "programs") {
            tuiSearchEditing = true;
            renderTui();
            break;
          }
          return;
        case "u":
          if (tuiPage === "programs" && !tuiSearchEditing && tuiSearch) {
            tuiSearch = "";
            renderTui();
            break;
          }
          return;
        case "n":
        case "N":
          if (tuiPage === "categories" && !tuiSearchEditing) {
            if (goToPrograms()) setPage("tui", "programs");
            renderAll();
            break;
          }
          return;
        case "s":
        case "S":
          if (tuiSearchEditing) return;
          if (tuiPage === "categories") {
            showToast("Settings is not part of this demo.");
            renderAll();
            break;
          }
          if (tuiPage === "programs") {
            showToast("Cleaning is not simulated here.");
            renderAll();
            break;
          }
          return;
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

  /* Chrome that differs per page: the back arrow (has_back() is true for the
     program page), the primary button's label, and the footer hints. */
  function renderChrome() {
    var back = document.getElementById("gui-back");
    if (back) back.hidden = guiPage !== "programs";

    var next = document.getElementById("gui-next");
    if (next) next.textContent = guiPage === "programs" ? "Start Cleaning" : "Next";

    var count = document.getElementById("tui-count");
    if (count) {
      count.textContent =
        tuiPage === "programs"
          ? "Programs (" +
            programs.filter(programChecked).length + "/" + filterPrograms(programs, tuiSearch).length + " shown)"
          : "Categories (" + selectedCount() + "/" + CATEGORIES.length + " selected)";
    }

    var btn = document.querySelector("#tui-frame .term__btn");
    if (btn) btn.textContent = tuiPage === "programs" ? " Start Cleaning " : " Next ";

    var foot = document.getElementById("tui-foot");
    if (foot) {
      var live = toast && Date.now() < toast.until;
      foot.textContent = live
        ? (toast.kind === "warn" ? " " + toast.message : " " + toast.message)
        : tuiPage === "programs"
          ? "↑↓ move · space select · → cats · / search · S start · esc back · ? changelog · G repo · q quit"
          : "↑↓ row · tab column · space select · →/enter subs · n next · s settings · ? changelog · G repo · q quit";
      foot.classList.toggle("t-warn", !!live);
    }
  }

  function renderAll() {
    renderGui();
    renderTui();
    renderChrome();

    // A popup shows a category's entries, so it has to follow a toggle. The
    // cell that opened it was just replaced, so re-anchor to its new node.
    if (guiPopIndex !== -1) {
      openGuiPop(guiPopIndex, document.querySelector('[data-submenu="' + guiPopIndex + '"]'));
    }
    if (tuiPopIndex !== -1) renderTuiPop();
  }

  /* ── Wiring the primary buttons ─────────────────────────────────────────
     The window mock's button is a real <button>; the terminal one is the
     pinned ` Next ` paragraph, so it gets a click handler of its own. */

  function initButtons() {
    var next = document.getElementById("gui-next");
    if (next) {
      next.addEventListener("click", function () {
        if (guiPage === "categories") {
          if (goToPrograms()) setPage("gui", "programs");
        } else {
          showToast("Cleaning is not simulated here.");
        }
        renderAll();
      });
    }

    var back = document.getElementById("gui-back");
    if (back) {
      back.addEventListener("click", function () {
        setPage("gui", "categories");
        renderAll();
      });
    }

    var tuiNext = document.querySelector("#tui-frame .term__btnrow");
    if (tuiNext) {
      tuiNext.addEventListener("click", function () {
        if (tuiPage === "categories") {
          if (goToPrograms()) setPage("tui", "programs");
        } else {
          showToast("Cleaning is not simulated here.");
        }
        renderAll();
      });
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
  initButtons();
  initTuiKeys();
})();