# Phase 2 handoff

Implemented locally 2026-11-23, following Phase 1 commit `3b628a8`. Phase 2 is not committed.

## Features

- Generic collections with user-defined text, long-text, number, date, checkbox, and single-select fields; required validation; searchable records and edit forms.
- Stable field IDs preserve values on rename. Incompatible field type/option changes need explicit data-removal confirmation. Deletion previews the affected record count.
- Source list/detail window with linked record detail, organic opening placement, saved relative subpanel positions, and matching flyout close semantics.
- Subsets use source fan slot/ring constants, label orientation, radial collapse, fixed angular span, and shrinking child orbs. Rounded parent anchor arcs drag independently; both curved funnel attachment points are anchored to the source circle.
- Fan entities expand to hubs and can open their own nested canvases, with independent persisted cameras/layouts. Nested lists/subsets/items work.
- Items attach around their parent orb, store notes, and dynamically inherit its color. Collections start teal and Subsets yellow; users can change colors.
- Validated context-menu moves prevent cycles. Modifier drag moves a node's descendants and connected panels. Small collapsed orbs rotate around their parent when dragged.
- Source confirmation dialogs protect unsaved record/item edits when switching or closing the right flyout. Root/entity form cancellation also confirms unsaved changes.
- Snapshot migration v1 → v2 preserves IDs, layout, camera, colors, and attachments; new domain data remains in the same atomic IndexedDB snapshots.

## Validation

47 unit tests pass: source camera/placement/list helpers, organizer validation, schema conversion, required/typed record values, stale record revision rejection, select option changes, field deletion, nesting/cycle rules, item color inheritance, snapshot migration, multiple fan rings, constant fan angular span, and funnel endpoints at several source angles.

Headless Chrome passes user-created schemas/records, field rename preservation, linked record detail and matching flyout closure, Item note persistence, unsaved Item discard/cancel, fan collapse/expand width, draggable source anchor with a fixed target orb, nested entity content, and refresh persistence. The earlier Phase 1 browser checks also passed against the updated schema.

TypeScript and production build pass. The source parity script checks preserved helpers, styles, controls, dialogs, list/detail components, and drawing routines against the sibling Solayana checkout. Screenshots: `phase-2-subset.png`, `phase-2-nested.png`.

This does not replace Phase 6's full side-by-side authenticated Solayana runtime comparison, touch/mobile matrix, or large-data performance checks. AI, actual user skill editing, full file export/import, and hosted accounts remain later phases. No Supabase, OpenAI, Docker, or PHP is used by the running app.
