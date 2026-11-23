# Phase 3 — Local actions, skills, and full backups

Phase 2 committed as `30870c4`. Phase 3 is complete. This document is included in its implementation commit.

## Changes

- Local action catalog and filtered slash suggestions. Reused Solayana's actual `PromptTypeahead` rendering and styles; adapted discovery to organizer actions without member/project/API dependencies.
- Commands call the same validated domain functions as manual controls: create entities/collections/subsets/items, rename/color/move, expand/collapse, add fields/records, update Item notes, enable/disable skills. Collision avoidance applies to command-created branches.
- Preview requires explicit Confirm or Cancel. Snapshot revision changes invalidate previews; plan IDs can execute only once. Unsupported natural-language requests return an explicit AI-unavailable response.
- Skills list uses the unchanged source `CanvasSkillsDetails` and `CanvasDetailList`. Right-side editor supports name, unique command, description, instructions, enabled state, version, scope, and confirmed deletion. Unsaved flyout edits use existing discard protection.
- Enabled, in-scope local command skills execute through action previews. Free-form AI instructions are stored for Phase 5; never interpreted as JavaScript, shell, or access grants.
- Snapshot v3 adds skills; v1/v2 migrate without changing layout, IDs, or existing content.
- Full JSON backup includes attachment bytes and MIME types, nested content, skills, schemas, records, colors, cameras, and panels. Import validates format, hierarchy, field/record content, attachment IDs/bytes/limits, and previews explicit replacement. Existing data is untouched until confirmation. Import does not merge.
- No model selection, chat sidebar, network AI requests, new runtime dependencies, Docker, or credentials.

## Validation

- `npm test`: 53 tests passed, including migration, validation equivalence, stale/single-use confirmation, skill version/scope, byte-preserving backup round trip, and invalid backup rejection.
- `npm run build`: passed TypeScript and production bundle.
- `node scripts/check-source-parity.mjs`: passed; now includes unchanged Skills list and extracted typeahead rendering.
- `git diff --check`: passed.
- `scripts/browser-phase3.mjs`: passed in isolated installed Chrome context at localhost:5180. Verified suggestion selection, preview without writes, cancellation, confirmation, Skills editor, local skill command, attached file export/import replacement, and persistence on reload. No browser errors.
- Screenshot: `phase-3.png`.

## Limits / next phase

Local-only persistence. Hosted AI instructions do not run yet. Commands use explicit syntax and IDs shown in the action directory; no natural-language planner. Imported snapshots replace the local organizer after confirmation; export first to keep both. Existing local cross-tab conflict protection remains active.

Full authenticated side-by-side Solayana comparison and touch/mobile matrix remain Phase 6 checks. Phase 4 (Supabase) has not started.
