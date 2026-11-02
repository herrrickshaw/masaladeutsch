# Masala Deutsch — entry page and site-wide post widget

<!-- how-to-use-with-ai -->
> **New here?** See [How to use this repo with AI (Claude, Gemini, ChatGPT)](HOW_TO_USE_WITH_AI.md) — clone it, paste it into an AI tool, and ask in plain English.

Front door and shared browser code for [masaladeutsch.blogspot.com](https://masaladeutsch.blogspot.com),
a blog on India's trade, energy and industrial policy. The repository is published as-is through
GitHub Pages at `https://herrrickshaw.github.io/masaladeutsch/`. It produces no data of its own:
`index.html` reads the blog's own Atom feeds when opened, and `accordion.js` is the one script every
blog post loads to get its footer index, accessibility bar and a few layout fixes.

> Status: active. The JSON files under `data/` and `iem/` are snapshots exported from other projects
> and are refreshed by committing a new copy, never edited by hand here.

## What it does
- `index.html` — entry page: intro, calls to action and a live "Latest" list fetched from the blog feed on load.
- `accordion.js` — drop-in script for every post: topic index built from the blog's label feed (each topic
  filled on first open), a text-size / read-aloud accessibility bar, a Google Translate menu layout fix,
  an Auto-ads grid-layout fix, and a schema.org `BreadcrumbList`.
- `topics.html` — every article grouped by topic (a generated hub page, rebuilt per new post).
- `gazette-trail-reader.html` — reader for gazette-notification lineage (which notification amends which),
  backed by `data/gazette_trail.json`.
- `iem/` — search page over the IEM (Industrial Entrepreneur Memorandum) register, backed by `iem/iem_web.json`.
- `from-lit_review/` — literature-survey notes, source register and article commission queue for the blog.

## Quick start
```bash
git clone https://github.com/herrrickshaw/masaladeutsch.git
cd masaladeutsch
open index.html          # the pages are static; any browser works, no build step
npm test                 # syntax check + unit tests for accordion.js (Node 20+, no dependencies)
```

## How it works
`accordion.js` is served from GitHub Pages and loaded by a small `<script src>` stub at the foot of
each post (the `#gs-idx` "index-widget stub"), so one commit changes every post. It is deliberately one ES5 file with no build step
(old mobile browsers read the blog). On load it runs four isolated steps, each wrapped so a failure
in one can never break the page or the others:

| Step | Trigger on the page | What it adds |
|---|---|---|
| Accessibility bar | first `.artx` element, once (`data-a11y-done`) | three text-size buttons (scale `:root` font-size, remembered in `localStorage`) and Listen / Pause / Stop via the browser's `SpeechSynthesis`, read in the Google Translate target language (`googtrans` cookie) |
| Translate menu fix | `iframe.skiptranslate` appearing (MutationObserver) | injects CSS into Google's same-origin menu iframe so the language list is a scrollable column; promotes major Indian languages to the top |
| Auto-ads layout fix | always | CSS so an auto-placed ad inside `.gb-stats` / `.gs-head-order` spans the full row instead of splitting the tiles |
| Topic index | `#gs-idx` element, once (`data-done`) | `BreadcrumbList` JSON-LD, then a JSONP call to `/feeds/posts/summary?max-results=0` for the label list; each `<details>` fetches its label feed (150 newest posts) on first open |

Feed access is Blogger's JSONP form (`alt=json-in-script` with a `gsIdxCb.cN` callback). The pure helpers (cookie → speech language, title suffix stripping, breadcrumb
object, label filtering, feed URL, read-aloud text) are exported when the file is `require`d by Node so
they can be unit-tested; in a browser that branch is skipped. An AdSense slot inside the index is
dormant until `AD_SLOT` is set, and renders only on the `.blogspot.com` host.

## Repository layout
| Path | Purpose |
|---|---|
| `index.html` | Entry page; fetches the latest posts from the blog feed at load time |
| `accordion.js` | Site-wide post widget (see above). Single file, served from GitHub Pages |
| `topics.html` | Generated topic hub; rebuilt when a post is added (not edited by hand) |
| `gazette-trail-reader.html`, `data/gazette_trail.json` | Gazette Trail Reader page and its dataset snapshot |
| `iem/` | IEM Register search page and its dataset snapshot |
| `data/dpiit_fdi_district.json`, `data/trade8.json` | Dataset snapshots used by blog posts |
| `from-lit_review/masaladeutsch/` | Literature survey, source register, commission queue (markdown) |
| `assets/`, `covers/` | Favicons and a self-hosted book cover |
| `tests/` | `node:test` suites for `accordion.js` |
| `.github/workflows/quality-gates.yml` | gitleaks secret scan + `npm test` on push / PR |

## Data sources
| Source | What is taken | Access route | Licence / caveat |
|---|---|---|---|
| Blogger Atom feeds for masaladeutsch.blogspot.com | post titles, URLs, dates, label list | JSONP at runtime in the reader's browser | The blog's own content; nothing is stored in this repo |
| Gazette / IEM / DPIIT FDI / trade JSON | pre-processed snapshots | committed files, produced by other projects | Refresh = commit a new copy; provenance is recorded in the producing project |

## Configuration
No environment variables and no secrets. The only switches live at the top of `accordion.js`:
`BASE` (blog origin), `INDEX_PATH` (the full-index post), `HIDDEN_LABELS`, `AD_SLOT` (empty = no ad unit),
font-size steps and the speech-language map. The AdSense publisher id in `index.html` and `accordion.js`
is a public client id, not a credential. Blogger API keys or OAuth tokens are never committed.

## Testing
```bash
npm test     # node --check accordion.js && node --test
```
`tests/accordion.test.js` covers the exported pure helpers and loads the file under a stub DOM;
`tests/accordion.dom.test.js` is a characterisation test that feeds canned Blogger JSONP responses
to the script and checks the DOM it builds. Everything else (the translate-menu fix, speech output,
ad placement) is verified manually on a published post.

## Limitations and known issues
- Do not change `#gs-idx`, `.artx`, `data-done` / `data-a11y-done`, the `gsIdxCb` callback name or the
  feed URLs without updating the blog template: published posts depend on them.
- Chrome stalls long `SpeechSynthesis` utterances after ~15 s idle; the script pauses/resumes every 10 s
  as a workaround.
- The Google Translate menu fix depends on Google's iframe being same-origin and table-shaped; if that
  changes the fix silently does nothing (by design).
- The generated pages (`topics.html`, `gazette-trail-reader.html`, `iem/index.html`) and the JSON
  snapshots are large and are regenerated elsewhere; edits here will be overwritten on the next refresh.

## Related repositories
The entry and topic pages are built by `tools/build_index_page.py` in the blog's archive repository,
which also holds the post sources this site links to.

## Licence
No licence file yet — all rights reserved.
