# Phase 4 readiness audit — Supabase integration

Date: November 25, 2026. Audited revision: `bb9916a` plus this documentation update.

## Result

Ready to start Phase 4 without redesigning Canvas. Auth, database schema, Storage, account boundaries, and the hosted repository do not exist yet. The current app remains local-only. No database migration, live account, secret, or local organizer was changed by this audit.

The Supabase project URL/ref, public publishable/anon key, and production site origin are not configured in this repository. Request the URL/ref and origin first; put public configuration in local environment files/Cloudflare build variables and keep private credentials out of the frontend.

## Findings, in implementation order

### 1. Save lifecycle must be upgraded before enabling network persistence — high

Evidence: `src/app/App.tsx:27–37`, `src/storage/indexedDb.ts:29–50`, and `src/storage/repository.ts`.

All logical changes, panning, zooming, panel movement, and attachment updates flow through one snapshot save after 180 ms. IndexedDB serializes writes and checks the stored revision. That is a useful boundary, but it is not a network-safe sync protocol.

An older in-flight save can resolve after a newer edit and set the UI to Saved before that newer edit is acknowledged. An error has no explicit retry control; closing the repository does not cancel queued work. The current status text only describes browser storage.

Required: distinguish pending from acknowledged revisions; serialize/coalesce cloud writes; keep server version separate from local revision; detect concurrent writers atomically; give failures an explicit retry/export path. Persist layout separately so panning does not resubmit all records, tasks, and files. Flush or retain unsaved edits before sign-out. Ignore old-session results after account switches, and prevent a queued save from using the next account’s repository/session.

### 2. Auth ownership and session isolation are absent by design — high

Evidence: `src/app/App.tsx:17`, `src/storage/indexedDb.ts:10–21`, `src/main.tsx`, `src/canvas/CanvasWorkspace.tsx` account menu and transient state.

There is one origin-wide IndexedDB organizer (`current`), no auth gate, and no Supabase dependency or project configuration. The local root hub UUID is a content identifier, not a trusted account ID.

Required: derive owner IDs from Supabase Auth in database policies/write functions, not from `rootId` or a request field. Use an account/session-keyed workspace and hosted cache. Clear prompt drafts, pending plans, selected files, open editors, and confirmation preferences on account changes. Do not silently display the old browser organizer for a newly signed-in account. Keep the original local organizer separate for an explicit import preview.

Supabase documents owner-scoped RLS and its authenticated/anonymous roles: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 3. Complete current data must round-trip; the original Phase 3 model is incomplete — high

Evidence: `src/organizer/model.ts:4–13`, `src/organizer/tasks.ts`, `src/canvas/CanvasWorkspace.tsx` fan sources and Group browsing.

The current persisted shape includes:

- Root/Space/Collection/Group/Item/Skills nodes, plus `tasks` branches.
- Ordered task arrays with stable task IDs, completion flags, and timestamps.
- Group field values, singular labels, schemas, record revisions, and nested parent relationships.
- `fanPositioned`, saved `fanAnchor` geometry, anchor angles, collapse/spread/open flags.
- Per-view cameras, open panels, selected records, sub-panel positions, expanded Space IDs, and node world positions.
- Skills, notes, attachment Blobs, schema version, snapshot revision, and development-fixture markers.

Do not build a serializer from the Phase 3 inventory alone. Preserve IDs and array order. Keep temporary directory queries/scroll position, task completion-animation timers, hover state, prompt focus, and draft previews out of durable content.

Recommendation: retain the repository’s snapshot boundary for the first hosted version: profile + owner-scoped JSONB organizer content + owner-scoped layout + private attachment manifest + import receipts. Persist server ownership/version outside the payload, validate writes, and use an atomic save operation. This minimizes canvas churn and preserves new fields. Tradeoff: snapshot writes are coarser than normalized record writes; cap payload size and measure growth. Granular normalization/collaboration is a later decision.

### 4. Attachment persistence needs a separate remote protocol — high

Evidence: `src/storage/backup.ts`, `src/canvas/CanvasWorkspace.tsx` `addFiles`, and `src/organizer/model.ts` `LocalAttachment`.

Current files are real Blobs inside the IndexedDB snapshot; full backups encode those bytes. JSON serialization into PostgreSQL cannot preserve Blob content. Reuploading the same files for every camera move is unacceptable.

Required: private bucket; account-prefixed object paths; owner-scoped metadata; 10 MB per-file / 25 MB current aggregate limits validated at the backend; file bytes uploaded only when new/changed; authenticated downloads or short-lived signed access. Keep export capable of reconstructing complete backups. Upload before committing references; use staged immutable object names and an import/save receipt so interrupted requests can retry. Do not delete previously referenced files until replacement is committed; define orphan cleanup.

Supabase Storage has its own policies, separate from application-table RLS: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

### 5. Existing validators are useful but not a cloud authorization boundary — high

Evidence: `src/organizer/model.ts:63–96` and `src/storage/backup.ts`.

Local validation covers important nesting, field, record, skill, and camera rules. It does not comprehensively validate attachment metadata/Blob consistency, all ID shapes, task timestamps, saved fan anchors, expanded-node references, or all sub-panel coordinates. Backup decoding has additional file validation that direct snapshot saves do not share.

Required: define and test a shared persisted-payload validator plus backend size/shape/ownership checks. A browser can bypass React validation. RLS must protect the whole owner envelope even when the payload is malformed. Database functions need deliberate grants and execution security; preserve RLS rather than bypassing it by default. [Database functions](https://supabase.com/docs/guides/database/functions).

### 6. Import must be separate from ordinary save — high

Evidence: `src/storage/repository.ts`, `src/storage/backup.ts`, `src/canvas/CanvasWorkspace.tsx` backup replacement preview, and `src/app/App.tsx:19–21`.

The current import intentionally replaces local data after preview. A cloud save implemented as a blind upsert would silently replace an existing account organizer. Storage writes and database writes also cannot be treated as one distributed transaction.

Required: local-to-cloud copy preview, stable IDs, an immutable source digest/import ID, staged file upload, and an atomic create-if-empty/finalize step. A lost response must be distinguishable from a failed commit using an import receipt. Retry the same import rather than duplicate it. If cloud content exists, keep both sides intact and offer explicit choices. Do not automatically upload the development 451-Space fixture on sign-up.

### 7. Profile label and auth redirects must stop using demo assumptions — medium

Evidence: `src/canvas/CanvasWorkspace.tsx:427–430`.

The user title is You; a root named You currently renders John McGuinness as its subtitle. There is no separate authenticated full-name source. Use a profile row linked to the session for the subtitle. Preserve user content IDs when binding the account.

Set the deployed Site URL and allowed callback/recovery URLs deliberately; include explicit development origins. Test email confirmation and recovery on the deployed domain. Do not allow a deployed signup to default to localhost. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

### 8. Plan and old regression gates drifted — medium

Evidence: `IMPLEMENTATION_PLAN.md`, `README.md`, `scripts/check-source-parity.mjs`, `scripts/browser-smoke.mjs`, `scripts/browser-phase2.mjs`, `scripts/browser-phase3.mjs`.

The old plan still described a top-right toolbar, source blur/blocking, earlier fan rows, and no Tasks. The old browser scripts use removed Manage skills controls, old /entity suggestion labels, and an initial two-node fixture assumption. Source equality is no longer valid for the approved Kirayana-specific CSS/context-menu updates.

The audit updates the implementation plan to the accepted behavior. Repair the legacy scripts or replace them with current acceptance tests before treating them as Phase 4 gates. Do not revert approved UI changes to make byte-equality tests pass. README navigation text also needs follow-up; it still references Skills → Manage skills.

## Phase 4 implementation order

1. Save coordinator and session-safe repository lifecycle, with delayed/out-of-order/failing-save tests.
2. Auth, confirmed signup, sign-in/out, recovery, and profile-backed name; separate left account/profile flyout using the existing left frame.
3. SQL migrations, owner-scoped tables/functions, private bucket policies, and payload validation.
4. Hosted repository with separate content/layout revisions and attachment transport.
5. Explicit retry-safe local import; existing cloud organizers protected.
6. Deployed-origin auth verification and two-account negative tests; reconnect/sign-out/conflict/import recovery tests.

Use the Supabase JavaScript client when implementation begins; adding that runtime dependency belongs to Phase 4. Keep service-role credentials server-side. No OpenAI key is needed for Phase 4; AI remains Phase 5. No Docker dependency is introduced.

## Validation from this audit

- `npm test`: **78 passed**, 15 test files.
- `npm run build`: **passed** TypeScript and Vite production build.
- Production asset check: no `large-group-451-v1` or `Space 451` fixture string found in built JavaScript.
- `scripts/check-source-parity.mjs`: **fails at CanvasWorkspace.css**, expected after approved styling/focus/panel changes. It is not a valid current release gate.
- `scripts/browser-groups.mjs`: **passed** 451-Space virtualization/search/paging, expanded positions, pan/zoom, and reload.
- `scripts/browser-tasks.mjs`: **passed** add/hover/complete/hide/restore/delete and refresh persistence.
- Legacy Phase 1–3 browser scripts: inspected, not run; known stale assumptions listed above.
- Supabase/RLS/two-account/email/storage tests: **not run**, because no Kirayana Supabase project is configured.

## External configuration needed

- Kirayana Supabase project URL/ref and public publishable/anon key.
- Production frontend origin and desired development callback origins.
- Project access to apply migrations and Storage/Auth settings without exposing secret credentials in chat.

Audit-only changes: documentation. App behavior and local data are unchanged. No commit or deployment performed.
