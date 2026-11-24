# Kirayana

Private hosted organizer, built from Solayana's Canvas. Temporary product name.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5180. No Docker, Supabase, or AI credentials required. Dark mode is the default.

## Local canvas

- Local user hub and collapsed Skills orb.
- Right-click to add, rename, recolor, expand/collapse, or enter a space.
- Drag orbs; hold Command/Control to move descendants too. Drag empty space or use two fingers to pan. Pinch or Command/Control-scroll to zoom.
- Click an expanded orb for details; click a small orb to expand. Double-click the main hub to collapse/expand children. Double-click a Space to expand/collapse its orbs. Use Open [name] canvas in its right-click menu to enter.
- Detail panels retain world positions during panning. The right-side flyout overlays the canvas.
- Prompt with local slash actions, previews, confirmation, and file attachments. Hosted AI is not connected.
- IndexedDB stores content, files, camera, layout, colors, and collapse state. The account menu exports and imports full backups, including file contents.

Local storage is tied to browser and origin. Clearing site data removes it. There is no cloud sync or account authentication yet. A second tab cannot silently overwrite a newer saved revision.

## Checks

```sh
npm test
npm run build
node scripts/check-source-parity.mjs
```

The source parity check requires the sibling `solayana` checkout. Its recorded revision and file hashes are in `artifacts/solayana-source.json`.

Browser smoke checks use Playwright with installed Chrome and a running dev server:

```sh
# Optional test tool, not an application dependency
npm install --no-save --package-lock=false playwright
node scripts/browser-smoke.mjs
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright module. Browser checks use disposable isolated contexts, not your organizer data.

## Architecture

`src/canvas` preserves source drawing routines and shared panel/camera geometry. `src/organizer` defines generic records and validation. `src/storage` exposes an async repository backed by IndexedDB. Branding lives in `src/app/brand.ts`. Supabase and a server-side shared OpenAI key are later phases; never put an AI key in a Vite variable.

## Phase 2 organizer features

Right-click a user/space hub to create a Collection, Group, or Item. Collections have editable fields (text, long text, number, date, checkbox, and single-select), required validation, searchable records, linked record details, and right-side editing. Field renames keep values. Field deletion and incompatible conversions require explicit confirmation.

Groups reuse the source fan and curved connector. Add spaces to a Group, click its arc to collapse/expand, and drag the rounded parent anchor to reposition the connector. Click a fa space to expand its hub, or use its right-click Open canvas action to enter. Nested spaces can contain their own lists, groups, and items. Context menus support validated moves and prevent cycles.

Items hold notes and inherit their parent space's color. Unsaved record/item edits are protected when closing or switching the flyout. Snapshot schemas v1 and v2 migrate to v3 on load without replacing IDs or layout. Supabase and hosted AI remain later phases.

Phase 2 UI smoke checks: `node scripts/browser-phase2.mjs` (same optional Playwright setup as above).

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [artifacts/PHASE_1.md](artifacts/PHASE_1.md), and [artifacts/PHASE_2.md](artifacts/PHASE_2.md).

## Phase 3 actions, skills, and backups

Type `/` for keyboard-accessible suggestions (arrows, Tab to insert), or choose **Your account → Browse actions**. Commands create spaces, collections, groups, and items; rename, recolor, move, expand/collapse orbs; add fields/records; and update Item notes. The directory shows syntax and orb IDs. Every command has a preview with Confirm/Cancel. Changes invalidate old previews; confirmation is single-use. Manual controls and commands use the same domain validation.

Open **Skills → Manage skills** to add a name, unique slash command, description, instructions, enabled state, and optional space scope. Instructions containing one local slash command can run now with the same preview. Other instructions are saved for the hosted AI phase; they are not executed as code or sent anywhere. Disabled/out-of-scope skills do not appear or run.

**Export backup** includes nested content, fields, records, skills, layout, colors, and attachment bytes. **Import backup** validates the file and previews replacement. Export your current data before confirming replacement. File limits: 10 MB each, 25 MB total; backup limit: 40 MB. Import preserves IDs and does not merge organizers.

Phase 3 browser checks: `node scripts/browser-phase3.mjs`. See [artifacts/PHASE_3.md](artifacts/PHASE_3.md).

Groups define shared fields at creation (Name is always required). Set a singular item label, such as “website” for Websites, to customize Add actions. Edit fields from the Group’s context menu or detail panel. Each space stores its own values; schema renames preserve them, and incompatible changes/deletion require confirmation. Nested canvases remain available inside those spaces.

Group fans fill clockwise from 12 o’clock up to a full 360° ring, retaining the radial separator. Two visible rows hold 14 + 23 Spaces, with shrinking outer orbs and a 10-unit radial gap. Drag the rim to rotate through larger Groups; release to snap. Arrows page by 37 Spaces. Click the count or separator search icon for a searchable directory, sorting, letter jumps, and a position slider. Directory rows reveal and highlight a Space; the canvas icon opens its canvas. Search includes custom field values. Opened Spaces keep their stored world positions when browsing. Browsing filters and offsets are temporary per-view UI state; canvas data remains in IndexedDB.

Development adds the requested **451 Spaces** Group once, with Space 001 through Space 451. Existing data is preserved; deleting the Group does not recreate it. This fixture is excluded from production builds.

Group navigation checks: `npm test` covers row limits, filtering, all 500 search/window positions, rotation wrap, and one-time test data. With the dev server running, run `node scripts/browser-groups.mjs` (set `PLAYWRIGHT_MODULE` to your installed Playwright module path when needed) to check the 451-Space directory, keyboard reveal, paging, fixed opened-Space positions, rim rotation, pan/zoom, and reload behavior in a fresh browser context.
