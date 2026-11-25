# Kirayana

Private hosted organizer, built from Solayana's Canvas. Temporary product name.

## Run locally

```sh
npm install
cp .env.example .env.local
# Set the Supabase URL and publishable key in .env.local.
npm run dev
```

Open http://localhost:5180. Hosted mode requires the Supabase project below. No Docker or AI credential is needed. Midnight is the default theme.

For the original browser-only developer canvas, run `VITE_LOCAL_CANVAS=true npm run dev`. This flag works only in development; production always requires Auth.

## Themes

Use the palette icon in the floating toolbar to choose Midnight, Linen, Garden, Seaside, Lavender, or Fireside. Themes change colors only; canvas positions, content, node colors, controls, and interactions remain intact. The preference is stored in this browser, separately from organizer data and backups. Use arrow keys in the theme menu and Escape to close it.

Theme checks: `node scripts/browser-themes.mjs` with the dev server running. Set `PLAYWRIGHT_MODULE` to an installed Playwright module when needed; optionally set `THEME_SCREENSHOT_DIR` to save previews.

## Local canvas

- Local user hub and collapsed Skills orb.
- Right-click to add, rename, recolor, expand/collapse, or enter a space.
- Drag orbs; hold Command/Control to move descendants too. Drag empty space or use two fingers to pan. Pinch or Command/Control-scroll to zoom.
- Click an expanded orb for details; click a small orb to expand. Double-click the main hub to collapse/expand children. Double-click a Space to expand/collapse its orbs. Use Open [name] canvas in its right-click menu to enter.
- Detail panels retain world positions during panning. The right-side flyout overlays the canvas.
- Prompt with local slash actions, previews, confirmation, and file attachments. Hosted AI is not connected.
- IndexedDB stores content, files, camera, layout, colors, and collapse state. The account menu exports and imports full backups, including file contents.

Local storage is tied to browser and origin. Clearing site data removes it. Browser-only developer mode has no account authentication. Hosted production uses Supabase Auth and account storage. A second tab cannot silently overwrite a newer saved revision.

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

`src/canvas` preserves source drawing routines and shared panel/camera geometry. `src/organizer` defines generic records and validation. `src/storage` exposes an async repository backed by IndexedDB. Branding lives in `src/app/brand.ts`. Supabase powers hosted accounts and persistence. A server-side shared OpenAI key is Phase 5; never put an AI key in a Vite variable.

## Phase 2 organizer features

Right-click a user/space hub to create a Collection, Tasks list, Group, or Item. Collections have editable fields (text, long text, number, date, checkbox, and single-select), required validation, searchable records, linked record details, and right-side editing. Field renames keep values. Field deletion and incompatible conversions require explicit confirmation.

Tasks lists support quick task entry, completion, restore, and deletion. Check and trash controls appear on row hover or keyboard focus (always visible on touch screens). Completed tasks hide by default; Show completed reveals them. Tasks persist in local storage and full backups. Use `/tasks Name` or Add Tasks from a hub’s context menu. Browser flow check: `node scripts/browser-tasks.mjs` with the dev server running and `PLAYWRIGHT_MODULE` set when needed.

Groups reuse the source fan and curved connector. Add spaces to a Group, click its arc to collapse/expand, and drag the rounded parent anchor to reposition the connector. Click a fa space to expand its hub, or use its right-click Open canvas action to enter. Nested spaces can contain their own lists, groups, and items. Context menus support validated moves and prevent cycles.

Items hold notes and inherit their parent space's color. Unsaved record/item edits are protected when closing or switching the flyout. Snapshot schemas v1 and v2 migrate to v3 on load without replacing IDs or layout. Hosted accounts and persistence are Phase 4. Hosted AI remains Phase 5.

Phase 2 UI smoke checks: `node scripts/browser-phase2.mjs` (same optional Playwright setup as above).

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [artifacts/PHASE_1.md](artifacts/PHASE_1.md), and [artifacts/PHASE_2.md](artifacts/PHASE_2.md).

## Phase 3 actions, skills, and backups

Type `/` for keyboard-accessible suggestions (arrows, Tab to insert), or choose **Your account → Browse actions**. Commands create spaces, collections, groups, and items; rename, recolor, move, expand/collapse orbs; add fields/records; and update Item notes. The directory shows syntax and orb IDs. Every command has a preview with Confirm/Cancel. Changes invalidate old previews; confirmation is single-use. Manual controls and commands use the same domain validation.

Open **Skills** and use its context menu to edit skills to add a name, unique slash command, description, instructions, enabled state, and optional space scope. Instructions containing one local slash command can run now with the same preview. Other instructions are saved for the hosted AI phase; they are not executed as code or sent anywhere. Disabled/out-of-scope skills do not appear or run.

**Export backup** includes nested content, fields, records, skills, layout, colors, and attachment bytes. **Import backup** validates the file and previews replacement. Export your current data before confirming replacement. File limits: 10 MB each, 25 MB total; backup limit: 40 MB. Import preserves IDs and does not merge organizers.

Phase 3 browser checks: `node scripts/browser-phase3.mjs`. See [artifacts/PHASE_3.md](artifacts/PHASE_3.md).

Groups define shared fields at creation (Name is always required). Set a singular item label, such as “website” for Websites, to customize Add actions. Edit fields from the Group’s context menu or detail panel. Each space stores its own values; schema renames preserve them, and incompatible changes/deletion require confirmation. Nested canvases remain available inside those spaces.

Group fans fill clockwise from 12 o’clock up to a full 360° ring, retaining the radial separator. One visible row holds 14 Spaces. Arrows stream Spaces through the 12 o’clock separator, entering from the left and exiting to the right; Previous reverses the flow. Arrows page by 14 Spaces. Click the count or separator search icon for a searchable directory, sorting, and letter jumps. Directory rows reveal and highlight a Space; the canvas icon opens its canvas. Search includes custom field values. Opened Spaces keep their stored world positions when browsing. Browsing filters and offsets are temporary per-view UI state; canvas data remains in IndexedDB.

Development adds the requested **451 Spaces** Group once, with Space 001 through Space 451. Existing data is preserved; deleting the Group does not recreate it. This fixture is excluded from production builds.

Group navigation checks: `npm test` covers row limits, filtering, all 500 search/window positions, and one-time test data. With the dev server running, run `node scripts/browser-groups.mjs` (set `PLAYWRIGHT_MODULE` to your installed Playwright module path when needed) to check the 451-Space directory, keyboard reveal, paging, fixed opened-Space positions, pan/zoom, and reload behavior in a fresh browser context.


## Phase 4: Supabase hosting

Project: `slxlhuiooewsgfumygmx` · https://slxlhuiooewsgfumygmx.supabase.co · production: https://kirayana.com.

Set these **public Vite build variables** locally and in the hosting build environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the supplied project URL and publishable key. `.env.local` is ignored by Git. Do not set a service-role key in Vite. The public key works with RLS; it does not grant access to another account.

Sign up with a full name, confirm email, then sign in. Reset/resend flows use the current origin; Supabase is configured for `https://kirayana.com/` and local port 5180. The production Site URL is `https://kirayana.com`. External email delivery still depends on the project's Supabase email/SMTP settings. No custom email service is added.

A new account automatically opens a fresh canvas with the user at its center. Existing accounts reopen their saved canvas. Browser data is never imported automatically or removed. To bring over an existing organizer, export its backup and use **Your account → Import backup**; the existing preview/replacement flow preserves content, IDs, layout, skills, Tasks, and files. Developer test fixtures are never seeded into hosted accounts.

One organizer belongs to each account. `profiles` holds its full name; Auth owns email/password/session state. The **You** subtitle comes from the profile. Profile editing uses the left flyout. Sign-out flushes pending saves; if saving fails, retry or export before leaving.

Content and layout live in separate JSONB columns, with independent versions. Browser revisions are not database versions. Saves are coalesced and serialized; a transactional compare-and-swap RPC rejects stale tabs/devices. Receipt hashes make retries after a lost response idempotent. Receipts expire after 30 days; a later stale retry safely conflicts. There is no simultaneous collaborative editing or automatic realtime merge.

Attachments live in a private `attachments` bucket, at owner/attachment/SHA-256 paths. Files are immutable; only owners can read them, and only unreferenced files can be deleted. Limits remain 10 MB per file / 25 MB total. Uploads precede the reference commit; removal follows it. Interrupted uploads can leave unreferenced files, which can be removed through Storage after checking the current manifest. Files download when opening the organizer so backups and browser recovery include actual bytes. Lazy downloads are deferred; this trades startup bandwidth for complete recovery copies under the current 25 MB cap.

Unacknowledged edits are retained in a separate owner/tab-scoped IndexedDB recovery store. On the next sign-in, choose export, restore, or discard; recovery never silently replaces cloud data. A failed cloud load never falls back to browser data. Clearing site data removes unsaved recovery copies, not confirmed cloud saves.

### Migrations and account profiles

The shared CLI profile is `../supabase/kirayana.yaml`; credentials stay in macOS Keychain. Pass the profile and project explicitly:

```sh
npx supabase projects list --profile ../supabase/kirayana.yaml
npx supabase db push --remote=slxlhuiooewsgfumygmx --dry-run --profile ../supabase/kirayana.yaml
npx supabase db push --remote=slxlhuiooewsgfumygmx --profile ../supabase/kirayana.yaml --yes
```

The current migrations and Auth redirect settings have been applied. No Edge Function is needed for Phase 4; OpenAI/server-side actions remain Phase 5.

### Phase 4 checks

`npm test` and `npm run build` cover domain/wire validation and save lifecycle. `scripts/check-hosted-database.mjs` runs the migrations and RLS/CAS/idempotency checks in optional PGlite without Docker; set `PGLITE_MODULE` to an installed PGlite module. PGlite is not an app dependency.

`scripts/browser-hosted.mjs` checks Auth, explicit import, nested content/files, save/reload, profiles, two-account isolation, conflicts, lost acknowledgements, layout-only saves, and browser recovery against Vite and two disposable confirmed Supabase users. Set `HOSTED_TEST_USERS_FILE` to a private JSON file outside the repository: `{ "users": [{ "id": "…", "email": "…", "password": "…" }, { "id": "…", "email": "…", "password": "…" }] }`. The accounts must start empty. Do not use real user accounts for this check. It never reads an admin key.
