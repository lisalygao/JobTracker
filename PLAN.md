# JobTracker — Chrome Extension Implementation Plan

## Context

The repo is empty (only a README). The Google Doc architecture spec describes a **Manifest V3 browser extension** that:
- Detects job applications submitted on LinkedIn (Easy Apply) and external ATS platforms (Greenhouse, Lever, Workday, iCIMS, etc.)
- Uses a **confirm-before-save toast** (never silently logs — detection is a trigger, the user confirms/edits/dismisses)
- Stores `Application` + `ResumeVersion` records in `chrome.storage.local`
- Shows a side-panel UI: filterable application table, detail view, status updates, CSV export, settings
- Offers AI resume tailoring via **BYOK** (user's own Anthropic API key), saving results as `ResumeVersion` linked to the application
- Phase 2 (explicitly deferred by the doc): cross-device sync via Google Sheets/Supabase — **not in this plan's scope** beyond keeping the storage layer swappable

### Decisions (doc's open questions — user was asked but didn't answer; going with recommended defaults)
| Decision | Choice |
|---|---|
| Export format | **CSV only** (opens in Excel/Sheets; SheetJS .xlsx can be added later) |
| Job description capture | **Auto-scrape with manual paste fallback** (editable textarea always shown) |
| AI tailoring | **BYOK** — Anthropic API key entered in settings, direct browser → API calls |
| Sync | **Phase 1 local-only** per the doc's "don't build sync before capture is proven" |
| Stack | **TypeScript + Vite + CRXJS**, no UI framework (side panel is a table + forms in plain TS/DOM) |

## Project Structure

```
JobTracker/
├── manifest.config.ts          # MV3 manifest (via CRXJS defineManifest)
├── vite.config.ts
├── package.json / tsconfig.json
├── public/config/selectors.json   # ALL CSS selectors + ATS domain patterns (doc §3.4: never inline)
├── src/
│   ├── types.ts                # Application, ResumeVersion, message types, enums
│   ├── background/
│   │   ├── index.ts            # service worker: message router
│   │   ├── storage.ts          # CRUD over chrome.storage.local (stateless — MV3 worker can die anytime)
│   │   └── anthropic.ts        # tailoring API call (runs in worker, not content script)
│   ├── content/
│   │   ├── linkedin.ts         # Easy Apply MutationObserver detector
│   │   ├── ats.ts              # generic ATS confirmation-page detector
│   │   ├── toast.ts            # shared confirm/edit/dismiss toast (Shadow DOM)
│   │   └── scrape-jd.ts        # job-description scraper (selectors from config)
│   └── sidepanel/
│       ├── index.html / main.ts
│       ├── views/  (table, detail, tailoring, settings)
│       └── export-csv.ts       # manual CSV string builder + download
```

## Data Model (`src/types.ts`) — exactly per doc §4

- `Application`: id (uuid), date_applied, company, role_title, source (`linkedin_easy_apply | linkedin_external | greenhouse | lever | workday | other`), posting_url, status (`applied | interviewing | rejected | offer | withdrawn`), resume_version_id?, notes?, created_at, updated_at
- `ResumeVersion`: id, application_id, base_resume_snapshot, tailored_content, suggestions_given, created_at
- Storage keys: `applications: Application[]`, `resumeVersions: ResumeVersion[]`, `settings: { apiKey, baseResume }`
- Typed message protocol (content ↔ worker ↔ sidepanel): `SAVE_APPLICATION`, `GET/UPDATE/DELETE_APPLICATION`, `TAILOR_RESUME`, `SCRAPE_JD`, etc.

## Implementation Steps (doc §9 build order)

1. **Scaffold**: Vite + CRXJS + TS; manifest with `sidePanel`, `storage` permissions; host permissions ONLY for LinkedIn + the ATS domains listed in `selectors.json` (doc §8 — no broad permissions). Verify it loads unpacked in Chrome.
2. **LinkedIn Easy Apply detector + toast**: MutationObserver on the Easy Apply modal; fire only on the **"Application submitted" confirmation state**, not the Submit click (doc §3.1). Extract title/company/URL. If the "Apply" button redirects to an external site, do nothing — the ATS detector owns that. Toast rendered in Shadow DOM with confirm / inline-edit / dismiss; only confirm writes to storage.
3. **Storage layer**: worker-side CRUD, write-through immediately on every change (no in-memory state — doc §8). `crypto.randomUUID()` for ids.
4. **Side panel table view**: list applications, filter by status/company/date range, inline status dropdown, delete, detail view with notes + linked resume versions.
5. **CSV export**: build CSV string (proper quoting), download via Blob URL.
6. **External ATS detector**: content script registered against domains from `selectors.json`; heuristics = confirmation URL patterns (`/confirmation`, `/thank-you`) + text patterns ("application submitted", "we received your application"). Same confirm-toast; imperfect detection is acceptable by design (doc §3.2–3.3).
7. **Tailoring panel + settings**: settings view stores API key + base resume text. Tailoring flow: scrape JD from active tab (fallback: paste into always-editable textarea) → worker calls Anthropic Messages API (`claude-sonnet-5`, `anthropic-dangerous-direct-browser-access` header for extension-context calls) → returns suggestions + tailored draft.
8. **ResumeVersion save**: persist tailoring result linked to the application; show version history in detail view.
9. **Docs**: README with load-unpacked instructions, selector-maintenance guide (selectors.json is the first place to look when a detector stops firing), and a note on Phase 2 sync options.

## Verification

- `npm run build` produces a loadable `dist/`; `tsc --noEmit` clean.
- Automated: Playwright with the extension loaded (`--load-extension`) against **local fixture HTML pages** that mimic LinkedIn's Easy Apply modal and a Greenhouse-style confirmation page — asserts detector fires, toast appears, confirm writes the record, dismiss doesn't. (Real LinkedIn requires login; fixtures test the logic, selectors.json handles the live sites.)
- Manual checklist in README for live-site smoke test (Easy Apply → toast → confirm → row appears in side panel → export CSV).
- Tailoring call testable with a real key entered in settings; error states (no key, API failure) surfaced in the panel.

## Explicitly Out of Scope (per doc)
- Google Sheets / Supabase sync (Phase 2 — storage module kept behind an interface so a sync backend can slot in later)
- Serverless proxy for AI calls
- .xlsx export (CSV only for now)
