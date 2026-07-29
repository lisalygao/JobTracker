# JobTracker

A Chrome extension (Manifest V3) that detects job applications you submit on
LinkedIn and external ATS platforms (Greenhouse, Lever, Workday, iCIMS,
SmartRecruiters, Ashby), asks you to confirm before saving anything, tracks
applications locally, exports CSV, and suggests AI resume tailoring using your
own Anthropic API key (BYOK).

See [PLAN.md](PLAN.md) for the implementation plan and the original
architecture decisions.

## Setup

```bash
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select the `dist/` folder. Click the JobTracker toolbar icon to
open the side panel.

## How it works

```
content scripts (detectors + confirm toast)
        │  chrome.runtime.sendMessage
        ▼
background service worker (storage CRUD, Anthropic API calls)
        │  chrome.storage.local + broadcast
        ▼
side panel (table, filters, detail view, CSV export, tailoring, settings)
```

- **LinkedIn detector** (`src/content/linkedin.ts`): watches for the Easy
  Apply modal reaching its "application sent" confirmation state via a
  MutationObserver. It never fires on the Submit click alone.
- **ATS detector** (`src/content/ats.ts`): runs on known ATS domains and fires
  when the URL or page text looks like a confirmation page. Detection is
  heuristic by design — it only *triggers a toast*, never saves silently.
- **Confirm toast** (`src/content/toast.ts`): shows "application detected —
  save it?" with editable company/role fields. Only confirming writes to
  storage.
- **Storage** (`src/background/storage.ts`): `Application` and `ResumeVersion`
  records in `chrome.storage.local`, written through immediately (the MV3
  worker can be killed at any time).
- **Resume tailoring** (`src/background/anthropic.ts`): sends your base resume
  plus the job description to the Anthropic API with your own key, and saves
  the suggestions + tailored draft as a `ResumeVersion` linked to the
  application. The job description can be scraped from the active tab or
  pasted manually in the detail view.

## Settings

Open the side panel → **Settings**:

- **Anthropic API key** — get one at <https://platform.claude.com/>. It is
  stored in `chrome.storage.local` on this machine only, and calls go directly
  from the extension to the API.
- **Model** — defaults to `claude-opus-5`.
- **Base resume** — plain-text resume used as the source for tailoring.

## Maintaining detectors (read this when a detector stops firing)

All CSS selectors, confirmation text/URL patterns, and ATS domain→source
mappings live in **`public/config/selectors.json`** — never in code. When
LinkedIn or an ATS changes their layout, update that file and rebuild.

To support a **new ATS domain**, two files must change together:

1. `public/config/selectors.json` — add the domain under `sourceDomains` (or
   rely on the generic heuristics).
2. `public/manifest.json` — add the domain to `host_permissions` and to the
   ATS entry in `content_scripts.matches` (manifest match patterns must be
   static, so this list can't be read from the config at runtime).

## Development

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests (CSV, detection heuristics, filters)
npm run build       # vite (side panel + worker) + esbuild (content scripts)
npm run test:e2e    # Playwright against local fixture pages (build first)
```

The e2e tests load the built content scripts into fixture pages that mimic
LinkedIn's Easy Apply modal and a Greenhouse-style confirmation page, with the
`chrome.*` API stubbed — real sites require login, so fixtures verify the
detection/toast logic and `selectors.json` covers live-site drift.

### Manual live-site smoke test

1. Load the unpacked extension, open the side panel.
2. Apply to a job on LinkedIn with Easy Apply → after "Your application was
   sent", the confirm toast should appear → Save → the row appears in the
   side panel.
3. Apply on a Greenhouse/Lever posting → confirm the toast on the thank-you
   page.
4. In the side panel, change a status, add a note, export CSV, and open it in
   a spreadsheet.
5. In Settings, add an API key and base resume; on an application's detail
   view, scrape or paste the job description and run tailoring; a resume
   version should appear with suggestions.

## Roadmap (Phase 2, deliberately not built yet)

Per the architecture doc, cross-device sync (Google Sheets or Supabase) comes
only after the capture layer is proven reliable. The storage layer is isolated
in `src/background/storage.ts` so a sync backend can slot in behind the same
functions. Also deferred: `.xlsx` export (CSV only for now) and a serverless
proxy for AI calls (BYOK only).
