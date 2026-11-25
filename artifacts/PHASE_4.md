# Phase 4 — Supabase accounts and persistence

Date: November 25, 2026.

## Shipped in the working tree

- Supabase Auth gate: create account/full name, sign in/out, confirmation resend, password reset/recovery.
- Profile name and hub color in the left flyout; hosted You subtitle uses the profile.
- One owner-scoped organizer per Auth user; no organization/team model.
- Separate content/layout JSONB, independent versions, server compare-and-swap, explicit HTTP 409 conflicts.
- Canonical comparison tolerates Postgres JSONB key ordering; camera/orb layout edits do not rewrite content.
- Serialized/coalesced saves, revision-aware status, retained failed snapshots, retry, export, sign-out flush, and session isolation.
- Private immutable attachment paths, upload-before-reference commits, removal-after-commit, owner-only reads, and no deletion of referenced files.
- Explicit first-account browser import, stable retry operations, original local data retained, and no hosted fixture seeding.
- Owner/tab-scoped browser recovery for interrupted edits, export/restore/discard, and confirmation before replacement/deletion.
- Original local developer mode remains available with `VITE_LOCAL_CANVAS=true`; production cannot bypass Auth.

## Applied remotely

Project `slxlhuiooewsgfumygmx` only:

1. `202611250001_hosted_organizer.sql`: profiles, documents, operation receipts, RLS, Storage bucket/policies, validation, save RPC.
2. `202611250002_validator_aliases.sql`: fixes PL/pgSQL alias ambiguity with populated collections.
3. `202611250003_conflict_status.sql`: stale versions return HTTP 409 instead of a serialization error that caused retries/hanging requests through the hosted API.

Auth Site URL: `https://kirayana.com`. Allowed callbacks: `https://kirayana.com/`, `http://localhost:5180/`, `http://127.0.0.1:5180/`. Existing email confirmation remains enabled. Only these redirect settings were changed; no email provider/template was added.

Connection saved in the shared `../supabase/kirayana.yaml`, with a separate `kirayana` Keychain credential. The old selected Solayana credential was replaced during the first CLI login; its shared README flags the required re-login. Always pass an explicit profile and project ref.

## Validation

- `npm test`: **87 tests / 18 files passed**.
- `npm run build`: passed. Vite reports a bundle chunk above 500 kB; no build failure.
- PostgreSQL/PGlite harness: all migrations compile and pass owner isolation, anon denial, direct-write denial, spoofed owner/profile/file paths, populated content validation, atomic failure, immutable referenced files, version conflicts, receipt reuse/idempotency, and layout-only version updates.
- Real Supabase + Chrome, two disposable confirmed accounts: explicit browser import preserves nested Group/Space schema values, records, completed Tasks, fan anchors/positions, and exact attachment bytes; save/reload; profile; sign-out/account switch; owner isolation; HTTP 409 stale writes; lost-response retry; private files; layout-only saves; recovery with replacement confirmation. Passed.
- Auth callback check: intercepted signup proves notice and current-origin callback without sending mail; real Supabase-generated confirmation and recovery links verify the user, enter recovery, update the password, and sign in with the new password. Passed. No verification emails were sent by the tests.
- Existing local browser checks: all six themes, Tasks, and 451-Space fan assertions passed. The Group harness printed its passing result but its browser cleanup hung and the test process was stopped; the other local harnesses exited successfully.
- Large hosted fixture: **459 total nodes**, including the 451-Space Group. Content JSON: **87,223 bytes**; layout JSON: **104,284 bytes**. Observed content/layout save **693 ms**; camera-only save **528 ms**, with content version unchanged. These are single-run network measurements, not a latency guarantee.

Temporary users, documents, receipts, profiles, and files were removed after validation. The original browser organizer was never changed by these isolated test contexts.

## Release and limits

The frontend is not committed or deployed by this task. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the hosting build environment, then build/deploy. Local `.env.local` is configured and ignored by Git. No browser service-role key, Docker, or Phase 4 Edge Function is needed.

Production-origin UI/email delivery still needs a check after frontend deployment. Real callback behavior was checked against the allowlisted local origin; the production Site URL/allowlist were verified through the Management API. External mail delivery depends on Supabase's email/SMTP configuration.

Attachments download when opening the organizer (25 MB aggregate cap) so full backups and browser recovery retain real bytes. Lazy downloading is deferred. Interrupted uploads can leave unreferenced files; the owner can remove those after checking the committed manifest. Referenced files remain protected. Operation receipt hashes expire after 30 days; later stale retries conflict safely.

This is single-user cloud persistence with explicit conflicts, not realtime collaborative merging or an offline-first sync protocol. Browser recovery protects unacknowledged edits but cannot survive clearing site data. Shared OpenAI routing stays in Phase 5.
