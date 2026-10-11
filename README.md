# cyb3r.sh

A static Pandoc blog with client-side tools. Articles remain Markdown files in `src/articles/`; the index and RSS workflow is unchanged.

## Build and preview

Requires Bash, Pandoc, Python 3.9+, and Node.js 18+ with npm for bundled tools (Node 22 LTS recommended).

```sh
bash gen.sh             # articles, RSS, pages, tools
bash gen.sh clean       # regenerate the whole site
python3 -m http.server 8000 --directory site
```

Open http://localhost:8000/tools.html. Freeeme is at `/freeeme.html`; GPX keeps `/gpx-treadmill.html`, including existing `?route=` links.

Build tools alone:

```sh
python3 scripts/build_tools.py
```

The builder runs `npm ci` the first time a bundled tool is built and when its package files change. Subsequent builds reuse installed dependencies. Builds fail if any tool fails; no silently skipped tools. npm needs network access for installation, not for normal rebuilds or browser use.

## Add a tool

Create `src/tools/<slug>/` with `tool.json`, `content.md`, and assets. No edits to `gen.sh` or manual tool links needed.

```text
src/tools/example/
  tool.json
  content.md
  assets/
    style.css
    main.js
```

```json
{
  "title": "Example",
  "description": "A short description",
  "output": "example.html",
  "content": "content.md",
  "assets": "assets",
  "styles": ["style.css"],
  "scripts": ["main.js"]
}
```

Paths are relative to the tool directory. `styles` and `scripts` are relative to its asset directory; classic scripts load in their declared order. The output is a root-level HTML filename. The builder copies assets to `site/tools/<slug>/` and adds the tool to the list beneath the editable introduction in `src/tools.md`.

`content.md` is a normal Pandoc document with title metadata. For a tool made entirely of HTML, use a raw HTML block:

````md
---
title: Example
lang: en
...

```{=html}
<div class="example">
  <!-- Tool UI only: no html/head/body/site navigation -->
</div>
```
````

The existing `src/head.html`, `src/header.html`, `src/footer.html`, and `src/style.css` own the site shell. Tool pages are always regenerated, so shared template changes propagate even when tool content hasn't changed.

Scope tool selectors under a unique wrapper (`.example`) and use the site's `--background-color`, `--text-color`, `--border-color`, and `--accent-color` variables. A generated `body.tool-example` class allows page-specific styling. Keep the shared body width unchanged; widen only the tool wrapper when necessary so navigation and footer dimensions remain consistent. Do not copy the site header or redefine global theme variables in a tool.

## Bundled tools

Freeeme demonstrates Vite integration. Additional manifest fields:

```json
{
  "working_directory": "app",
  "install": ["npm", "ci"],
  "build": ["npm", "run", "build"],
  "assets": "app/dist",
  "bundle": {"manifest": ".vite/manifest.json", "entry": "src/main.js"}
}
```

Commands are argument arrays, run without a shell. Only trusted repository manifests should contain commands. The npm installation convention expects `package.json` and `package-lock.json` in the working directory. For other build systems, omit `install` and manage dependencies yourself.

Vite should use `base: './'`, `build.manifest: true`, and a JavaScript entry rather than a standalone HTML page. The builder reads the manifest to include hashed CSS and a module entry script; imported CSS is included too. Build metadata stays out of published assets.

There is no frontend framework requirement. Unbundled tools such as GPX need only Pandoc and Python when built alone.

## Deploy

Publish `site/` to the existing static host. This repository already tracks generated site files, so include regenerated tool pages/assets with source changes. Node/npm are build-time dependencies only; serving the site needs neither Node nor Python. If the server runs `gen.sh`, install the new build dependencies there as well.

Moved GPX assets now live under `tools/gpx-treadmill/`; the page URL and route-query format are unchanged. Deploy the regenerated pages together with their new asset directories. Old generated root-level GPX assets have been removed from this checkout.

## Checks

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Tests exercise shared template updates, asset copying/cleanup, automatic listings, Vite manifest handling, and invalid manifest paths. A clean full build should also be checked before publishing.

Optional browser smoke tests (Playwright stays outside the site dependencies):

```sh
npm install --prefix /tmp/cyb3r-browser-tests playwright
# Use an installed Chromium browser:
NODE_PATH=/tmp/cyb3r-browser-tests/node_modules CHROMIUM_PATH=/usr/bin/chromium-browser node scripts/browser-smoke.cjs
# Or install Playwright's Chromium, then omit CHROMIUM_PATH:
/tmp/cyb3r-browser-tests/node_modules/.bin/playwright install chromium
```

The smoke test starts its own temporary static server and checks shared navigation, PNG and animated GIF exports, caption dragging/resizing, keyboard controls, light/dark colors, mobile layout, and GPX upload. It also checks for missing assets and browser errors.

Freeeme stays entirely client-side: image editing, word wrapping, draggable/resizable captions, and PNG/animated GIF downloads. GIF export flattens transparency to white. Files are held in page memory, not uploaded or persisted. Large still photos are resized locally to a maximum 2048-pixel edge and 4 megapixels, preserving aspect ratio. Animated GIFs retain their original limits (4 megapixels per frame and 40 million total frame pixels). Files must be under 25 MB. Image loading uses the browser's standard image decoder for mobile compatibility; unsupported HEIC/HEIF photos need conversion to JPEG. Upload/export errors are displayed rather than hidden.
