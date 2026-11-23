# Phase 1 handoff

Implemented 2026-11-23. Source revision and hashes: `solayana-source.json`.

## Preserved source

Camera math, depth constants, collision/inspector placement, detail windows, floating flyout frame, orb/funnel drawing functions, the complete canvas stylesheet, shared global foundation and controls. Domain-aware workspace glue is adapted for local user/entities; no Solayana backend or fake PHP API is imported. Source repository is unchanged.

## Verification

- 37 unit tests: source camera/placement checks and organizer validation/invariants.
- TypeScript and production build pass.
- Headless Chrome: create/edit/recolor/drag, collapse/expand, panel world-position invariance during pan, matching flyout close, zoom and reload, attachment Blob persistence, shared toolbar/scene prompt blur, cross-tab stale-write rejection. No browser runtime errors.
- Source parity check compares preserved code against Solayana.
- Screenshots: `phase-1-initial.png`, `phase-1-entity-details.png`, `phase-1-prompt-focus.png`.

These screenshots document the port. A full side-by-side authenticated Solayana runtime comparison has not been performed. Fan/subset parity and schema-driven lists are Phase 2, and AI/skills editing are later phases. Do not interpret Phase 1 as completion of all planned canvas behaviors.

## Storage

IndexedDB database `kirayana-organizer`, version 1; atomic snapshots with attachment Blobs and revision checks. Schema validation rejects unsupported/corrupt records without replacing them. Browser errors preserve the current in-memory work and offer layout export. Full attachment export/import arrives in Phase 3.
