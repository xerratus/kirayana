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
- Right-click to add, rename, recolor, expand/collapse, or enter an entity.
- Drag orbs; hold Command/Control to move descendants too. Drag empty space or use two fingers to pan. Pinch or Command/Control-scroll to zoom.
- Click an expanded orb for details; click a small orb to expand. Double-click the main hub to collapse/expand children. Double-click an entity to enter its canvas.
- Detail panels retain world positions during panning. The right-side flyout overlays the canvas.
- Prompt, local file attachment, and response shell. AI is explicitly unavailable in this phase.
- IndexedDB stores content, files, camera, layout, colors, and collapse state. The account menu exports a layout backup (file contents excluded).

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

Right-click a user/entity hub to create a List/detail collection, Subset, or Item. Collections have editable fields (text, long text, number, date, checkbox, and single-select), required validation, searchable records, linked record details, and right-side editing. Field renames keep values. Field deletion and incompatible conversions require explicit confirmation.

Subsets reuse the source fan and curved connector. Add entities to a Subset, click its arc to collapse/expand, and drag the rounded parent anchor to reposition the connector. Click a fan entity to expand its hub, or double-click to enter its canvas. Nested entities can contain their own lists, subsets, and items. Context menus support validated moves and prevent cycles.

Items hold notes and inherit their parent entity's color. Unsaved record/item edits are protected when closing or switching the flyout. Snapshot schema v1 migrates to v2 on load without replacing IDs or layout. Skill editing, action discovery, Supabase, and AI remain later phases.

Phase 2 UI smoke checks: `node scripts/browser-phase2.mjs` (same optional Playwright setup as above).

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [artifacts/PHASE_1.md](artifacts/PHASE_1.md), and [artifacts/PHASE_2.md](artifacts/PHASE_2.md).
