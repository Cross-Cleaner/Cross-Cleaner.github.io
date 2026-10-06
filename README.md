# WinBooster.github.io

GitHub Pages site for **Cross Cleaner** — the addon-style system cleanup tool
that lives in [WinBooster/Cross-Cleaner](https://github.com/WinBooster/Cross-Cleaner).

Serves as the GitHub Pages root for the `WinBooster` user, so the URL is
<https://winbooster.github.io>.

## Layout

| Path                  | What                                                  |
| --------------------- | ----------------------------------------------------- |
| `index.html`          | The whole page. One document, no routing.             |
| `assets/css/styles.css` | Material 3 color roles + the page layout           |
| `assets/js/main.js`   | Theme toggle, mobile nav, tabs, scroll effects        |
| `assets/img/icon.png` | App icon, copied from `crates/winicon/assets`          |
| `manifest.webmanifest` | PWA metadata                                         |

## Stack

Static HTML plus [Material Web](https://github.com/material-components/material-web)
2.4.0, loaded as ES modules from `esm.run`. There is no build step and no
package manager: `index.html` is what gets served.

Theming uses Material 3 color roles (`--md-sys-color-*`). The hand-written CSS
and the Material Web components read the same custom properties, so switching
theme in `main.js` re-themes both at once. Light is the default; dark follows
`prefers-color-scheme` until a visitor picks a side, which is stored in
`localStorage` under `cc-theme`.

Material Web is in maintenance mode upstream — Google has frozen new component
work in favour of Lit. That is fine here: the components in use are stable, and
the page keeps working if the CDN is unreachable because they render as plain
inline elements first.

## Editing

Download links use GitHub's `releases/latest/download/<asset>` redirect, so they
always point at the newest release and need no updating per version. When a new
asset is added to the release workflow, add a button for it under
`#download` in `index.html`.

There are no real screenshots in the source repository — `crates/gui/assets`
holds placeholder images — so the Gallery section is drawn in CSS and HTML
rather than showing pictures of the app.

## Local preview

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. A plain `file://` open also works, but a
server is better: ES module imports are blocked on `file://`.

## Deploying

Push to `main`. GitHub Pages is configured for this repository to publish from
the branch root, and `.nojekyll` is committed so Jekyll leaves the files alone.