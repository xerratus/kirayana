# Kirayana implementation plan

Status: Phase 1 committed (`3b628a8`). Phase 2 committed (`30870c4`). Phase 3 complete; validation recorded in `artifacts/PHASE_3.md`. Phase 4 audited on November 25, 2026; integration not started. See `artifacts/PHASE_4_AUDIT.md` for findings, current scope, and rollout gates.

## Goal and fixed requirements

Build a private, hosted organizer using React, TypeScript, Vite, and eventually Supabase. Use `kirayana` as the temporary package, folder, and product name. Keep visible branding in one configuration module so a later rename is small.

Start with a local browser database. No Docker, PHP runtime, Supabase instance, authentication account, or AI credential is required to run the first canvas phase.

Solayana Canvas is the visual and interaction source of truth. Port the existing implementation; do not approximate it with a different graph library or redesign it. Leave the Solayana repository unchanged. Capture a source revision and file inventory when implementation begins.

Only requested product differences:

- Main hub represents the current user, not an organization.
- User-created spaces, Collections, Groups, and Items replace Solayana administration concepts.
- Floating toolbar is top left and contains logo/name, user, and help controls. Help uses a separate left flyout; right-side detail/search flyouts remain.
- Main prompt retains attachment and submit controls; no provider/model selector.
- No left chat flyout and no canvas shift for chat.
- Skills belong to the user hub and customize the user's organizer experience.
- Users can change standalone space, collection, and group colors. Spaces inside Groups inherit the Group color; Items inherit their parent’s resolved color.

Decisions confirmed by the user:

- Collections have user-defined fields.
- Groups contain full spaces, which can have their own lists, groups, and items. Support nested space canvases.

## Source inventory and port boundaries

| Solayana source (`apps/web/src/`) | Kirayana use |
| --- | --- |
| `CanvasWorkspace.tsx` | Preserve drawing, hit testing, gestures, animation, fan geometry, connectors, context menus, and render scheduling; replace fixed organization/project IDs and PHP calls with generic nodes and services. |
| `CanvasWorkspace.css` plus required global styles/tokens | Preserve background, grid, typography, orb treatment, panel styling, spacing, easing, and control styles, except subsequent approved Kirayana changes listed below. Carry only needed global rules to prevent style overrides. |
| `canvasCamera.ts`, `canvasDepth.ts`, `canvasInspector.ts` | Reuse camera transforms, depth behavior, opening placement, and collision avoidance. |
| `CanvasDetailWindow.tsx`, `CanvasDetailList.tsx`, `canvasDetailListFilter.ts` | Reuse movable list/detail windows and search/filter behavior. Supply generic schemas and records. |
| `CanvasRightFlyout.tsx` | Reuse the floating frame and height/color transitions. Replace domain-specific content with organizer forms. |
| `CanvasActionsDirectory.tsx`, action search and prompt insertion helpers | Preserve action discovery and insertion. Supply Kirayana commands. |
| `CanvasSkillsDetails.tsx` | Preserve skills list/detail presentation. Replace PHP skill persistence with the organizer repository. |
| Prompt, typeahead, response, attachment, and feedback components | Reuse prompt dimensions, focus behavior, response rendering, autocomplete, previews, and results. Do not import a hidden model selector or left chat dependency. |
| Shared controls, dialogs, confirmation, menus, and icons | Reuse the controls required for exact canvas presentation and keyboard behavior. Replace application-specific account content. |

The workspace is currently about 2,470 lines and its CSS about 604 lines. Do not copy the entire Solayana application or keep a fake organization/PHP API solely to satisfy imports. First identify direct/transitive dependencies, then separate domain data from the existing renderer with focused changes.

## Visual and interaction contract

Compare source and port at the same viewport, device pixel ratio, zoom, theme, layout, and interaction state. Start in dark mode. Use the same existing default camera behavior, geometry constants, timing, CSS tokens, font assets, and icon sizes.

Must preserve:

- Mouse drag, trackpad pan, wheel/pinch zoom, zoom around the pointer, recenter, and camera controls.
- Orb drag and modifier-assisted movement of connected children; pointer capture and click-versus-drag thresholds.
- Single click, double click, context-menu targets, keyboard equivalents, dismissal, and focus management.
- Expand/collapse animation. Group browsing uses the approved one-row stream through the 12 o’clock divider, with separate cone fades.
- Fan arc angular span during collapse, fan padding, one-row arrangement, and fan child placement. Pagination appears only above 14 matching Spaces.
- Draggable rounded anchor arc, both connector attachment points while dragging, curved funnel sides, and connector endpoint arcs.
- Separate nested canvas views and return navigation, with independent camera/layout state.
- Outward list/detail placement based on the originating branch, organic side selection near 12/6 o'clock, and collision avoidance on initial opening.
- Open world-space positions remain fixed during panning; do not rerun placement when the camera moves.
- Right detail flyout overlays the canvas, attaches to the right edge, keeps fixed top spacing, animates content height, scrolls at its maximum height, and retains the originating color while closing.
- Closing a detail also closes a matching flyout only when the target matches.
- Prompt focus dimensions, circular submit control, reply labels, spacing, and response scrolling. Prompt focus no longer blurs, shrinks, dims, or blocks the canvas.

Create a state-by-state parity checklist and reference screenshots before adapting domain behavior. Compare geometry and interaction transitions as well as static appearance. The following user-approved changes extend the original baseline and must survive Phase 4:

- Tasks branches: Enter to add; completion, restore, confirmed deletion, Show completed toggle; task content survives backups. One-second struck-through feedback followed by a 300 ms row collapse is temporary UI state.
- Group schemas and Collection schemas are defined at creation; Name is the default. Group Spaces have inherited color and optional saved fan anchors/initial placement markers.
- One-row, 14-Space Group fan, 360° arc and 12 o’clock divider, streaming pagination (1 second) and prefix filtering (500 ms); no rim drag or position slider. Independent 500 ms cone fades leave off-page expanded Spaces orphaned until their fan orb returns.
- Virtualized Group directory, stable expanded world positions, fixed saved cone anchors, and first-expansion placement along the fan direction.
- Labels below the visible fan edge; pagination below labels and behind the prompt.
- Inline panel headers show at most Search, Add, chevron, Close; Edit and Delete are in context menus. Context-menu sizing uses the viewport.
- Separate left Help flyout; profile/account management can reuse it. No left chat.
- User hub title is You; the subtitle must resolve from the signed-in profile rather than the current demo fallback.

Exact source-file equality is no longer the acceptance gate for intentionally changed files. Preserve the geometry/interaction contract and record approved differences in regression checks.

## Domain model

| Record | Purpose |
| --- | --- |
| User profile | Root hub name, appearance, and preferences. A local profile initially; Supabase Auth identity later. |
| Space | Full organizer hub, owned by a user; optionally belongs to a Group. |
| Collection | Collection branch on a space, with ordered field definitions and records. |
| Collection field | Stable ID, label, type, order, required/default settings. Begin with text, long text, number, date, checkbox, and single-select. |
| Collection record | Stable ID, collection ID, typed values keyed by field ID, timestamps, and revision. |
| Group | Branch on a space with the existing stroke arc/fan; contains ordered child spaces. |
| Tasks | Task-list branch with ordered task IDs, titles, completion flags, and timestamps; saved with its owner’s organizer. |
| Item | Single structured detail/note attached to a space; inherits its space's color. |
| Skill | User-owned instruction text, command, description, enabled flag, version, and optional space scope. |
| Attachment | Private file metadata and local Blob initially; private Supabase Storage object later. |
| Canvas view state | Per-user/per-view camera, positions, branch open/collapsed states, anchor angles, and panel positions. |
| Prompt history/action plan | Prompt replies and pending action previews, separated from space content. |

Use UUIDs, timestamps, explicit ordering, schema versions, and record revisions from the start. Enforce parent ownership, acyclic nesting, valid field types, and parent/child references. Root hub cannot be deleted. Skills remain available from the user hub rather than requiring a fake provider/model/organization node.

Colors use stored overrides for spaces, collections, and groups. Unset values use the existing palette. Items resolve color dynamically from the parent; connector/fan/flyout colors follow the source node. Color controls use the existing dialog/control styling.

Field renames preserve values because values use field IDs. Field deletion or incompatible type conversion requires a preview and confirmation; do not silently discard stored data.

## Storage and service boundaries

Use an async `OrganizerRepository` contract with local and hosted implementations. Components depend on that contract, not on IndexedDB or Supabase directly.

- Local phase: IndexedDB for structured data and attachment Blobs. Use localStorage only for small preferences where appropriate.
- Persist logical mutations transactionally. Save drag/camera changes on completion or a bounded debounce, not every render frame.
- Version the database and add explicit migrations. Report quota/storage failures without discarding in-memory edits.
- Provide JSON export/import before cloud migration; preserve IDs, relationships, field schemas, and layout. Include a defined attachment export format when file support lands.
- Supabase phase: Auth, PostgreSQL with RLS, private Storage, and Edge Functions. Use migrations and owner-scoped queries. No PHP service or Docker dependency.
- Switching from local to hosted is explicit, previewed, and retry-safe. Cloud ID ownership comes from the authenticated user, never a trusted browser-supplied owner ID.

Suggested structure:

```text
kirayana/
  src/
    app/                    # routes, branding, providers
    canvas/                 # ported canvas and interaction helpers
    organizer/              # domain types, validation, operations
    storage/                # repository contract, IndexedDB, later Supabase
    prompt/                 # prompt, actions, replies, attachments
    skills/                 # user skills and deterministic skill commands
    ui/                     # source controls, dialogs, menus
  supabase/                 # added when hosted backend starts
  IMPLEMENTATION_PLAN.md
```

## Actions, skills, and AI

Port Solayana's action/skill concepts and presentation; adapt their semantics to personal organization. Solayana's PHP handlers cannot be used directly in this React/Supabase application.

- One action registry powers context menus, action discovery, slash-command suggestions, and AI tool schemas.
- Typed operations include create/rename/move space, create/update collection fields and records, create group/item, set color, expand/open, and manage skills.
- Manual UI actions execute through the same validated domain services as prompt actions.
- Natural-language AI mutations produce a reviewable preview before execution. Destructive operations always require explicit confirmation.
- Pending plans store target IDs and revisions; recheck before applying. Duplicate confirmation must not replay writes.
- Skills can set instructions and preferred organization workflows. They do not execute arbitrary JavaScript, shell commands, or grant additional access.
- Begin with deterministic local commands; local canvas functionality must not depend on model availability. Show a clear unavailable state for natural-language AI until its backend exists.
- Hosted AI uses one application-wide `OPENAI_API_KEY` in Edge Function secrets. Never place it in Vite variables, browser storage, client bundles, user skills, or exported data.
- Edge Functions verify Supabase sessions, enforce ownership, validate action arguments, bound context/attachments, and apply per-user usage/rate limits before spending the shared key.
- Keep the model configured server-side; expose no model selector or user API-key configuration.
- Preserve the attachment UI now, with local files/metadata first. File extraction and sending file content to AI arrive with the hosted AI service; do not imply files are analyzed before that exists.

## Phased delivery

### Phase 1 — Exact canvas foundation with local persistence

Build a runnable React/TypeScript/Vite app. Port the actual canvas renderer and supporting UI; isolate organization-specific reads/writes behind the local repository. Start with a local user hub and attached Skills branch, collapsed. Use the existing context-menu treatment to add a space. Keep the floating toolbar (subsequently moved top left by request), prompt shell, attachments control, submit control, camera controls, and floating detail frame. No left chat flyout or model selector.

Port existing geometry and interaction helpers, rather than recreating lookalike components. Persist root/space positions, camera, collapse state, colors, and view navigation in IndexedDB. Use temporary reference fixtures for visual comparison; do not permanently seed example spaces into a user's organizer.

Acceptance:

- `npm install`, `npm run dev`, and `npm run build` work without Docker, Supabase, or OpenAI.
- The canvas matches Solayana's baseline background, orbs, controls, blur, and transitions except the explicit requested differences.
- Add/rename/recolor/drag a space, expand/collapse it, pan/zoom, and refresh without losing state.
- Single/double click, drag, right click, keyboard access, and flyout open/close follow the source behavior.
- Prompt shell renders with local replies/unavailable-AI messaging, without making secret-bearing API calls.
- Focused camera/placement/storage checks pass; capture baseline comparison screenshots.

### Phase 2 — Organizer branches and user-defined records

Add Collection, Group, and Item creation on the user hub and space hubs through existing right-click menus. Implement field definition/editing, typed record forms, list search, record details, and shared right flyout. Add color controls and inherited Item colors.

Port the complete fan and curved connector behavior for Groups. Allow full spaces inside fans, nested space canvases, and return navigation. Preserve separate view states and reject cyclic moves. Use the same list/detail and nested detail opening/closing behavior as the source.

Acceptance:

- A user builds nested spaces containing all three branch types, edits their content, and reloads successfully.
- Custom field edits preserve values and validate required/type constraints.
- Fan/arc/connector drag and collapse parity passes at several angles and zoom levels.
- Panels open outward without avoidable collisions and remain fixed in world space on pan.
- Matching detail/flyout close behavior and closing border-color animation match Solayana.

### Phase 3 — Local actions and customizable skills

Port action discovery/typeahead, preview/confirm/cancel feedback, Skills list/detail, and skill editing. Implement local deterministic organizer commands through the action registry. Add attachment persistence and export/import support.

Acceptance:

- Equivalent UI and slash-command actions produce the same validated local changes.
- Skills persist under the user hub and can be created, edited, enabled, disabled, and removed.
- Stale previews and duplicate confirmations do not corrupt data.
- Export/import preserves nested content, schemas, attachments, colors, and layout.
- No action opens a left chat flyout or requires selecting a model.

### Phase 4 — Supabase accounts and hosted persistence

Connect the Kirayana-specific Supabase project once its URL/ref and production origin are supplied. No project is currently configured. Add Auth, owner-scoped PostgreSQL migrations/RLS, private file storage, and the hosted repository. Keep all approved canvas changes above. Add local-to-cloud import with an explicit preview, stable IDs, validation, and retry handling. Use the existing UI language for account/loading/errors.

Recommended first hosted persistence shape: one owner-scoped, versioned JSONB organizer document per account, a profile row, private attachment metadata/objects, and import receipts. This matches the current atomic repository contract and preserves node-level Tasks and layout data. Keep Blob bytes outside JSONB. Keep owner identity and server version outside the user-supplied organizer payload. Server-side saves use a transactional compare-and-swap operation; separate the server version from the local snapshot revision. This is single-user persistence, not simultaneous collaborative editing.

Tradeoff: whole-content snapshots are simple and preserve existing behavior, but rewrite more data as organizers grow. Persist camera/layout separately from content, coalesce saves, upload only changed attachments, and measure the 451-Space case. Normalize content tables later when granular queries or collaborative writes justify that change; do not silently adopt last-write-wins in the meantime.

Sequence:

1. **Save/session foundation:** serialized/coalesced saves, revision-aware status, flush/retry/error handling, account-switch cancellation, and per-account cache boundaries. Keep the existing local organizer intact.
2. **Auth and profiles:** sign up/in/out, email confirmation, password recovery, explicit production/local redirects, profile-derived full name, and a session-keyed workspace. Deploy URL allowlists are configured in Supabase, not inferred from localhost defaults.
3. **Database and Storage:** owner-derived identity, RLS on every table and the private bucket, validated snapshot/attachment metadata, atomic version checks, and no browser service-role credentials. Add migrations before changing the app’s default repository.
4. **Hosted repository:** load/save the complete current model, separate content/layout persistence, lazy attachment downloads compatible with full backup export, and conflict/retry feedback. A failed load must not create or overwrite an empty organizer.
5. **Explicit import:** preview all content including Tasks and files, preserve IDs/order/anchors, copy rather than delete browser data, use an idempotency receipt and staged uploads, and reject an existing cloud organizer unless a separate confirmed replacement flow exists.
6. **Two-account and deployment checks:** verify isolated content/layout/skills/files, expired sessions, account switching with queued saves, concurrent-tab conflicts, interrupted imports, and email links on the actual hosted origin. No Docker is required; use the remote development project for database integration tests if no local Postgres instance exists.

Full-name demo fallback, development fixture seeding, old local-only status strings, obsolete smoke scripts, and the source-equality parity script must be addressed as part of these steps. Prompt drafts/plans/replies remain transient in Phase 4 and must reset on account changes. Shared OpenAI remains Phase 5.

Acceptance:

- Sign up/in/out and email confirmation work on the deployed origin.
- Two-user negative tests prove rows, files, skills, prompts, and layouts cannot cross accounts.
- Local data migration survives retries and does not silently replace an existing cloud organizer.
- Normal use/reload works with hosted persistence; network errors do not masquerade as saved edits.

### Phase 5 — Shared OpenAI integration

Add a Supabase Edge Function AI gateway, server model configuration, authentication/usage controls, bounded attachment processing, and structured action planning. Reuse local domain validation and require confirmation before AI writes.

Acceptance:

- Main prompt supports answers, attachments with documented supported formats, action previews, confirmation, cancellation, and result links using the existing Canvas response presentation.
- Enabled user skills influence authorized requests. Disabled skills do not.
- The shared key never appears in the client, logs, exports, or stored user content.
- Unauthenticated/cross-user requests, stale plans, invalid tool arguments, excessive requests, and provider failures are handled explicitly.
- The organizer remains usable when AI is unavailable.

### Phase 6 — Hosted release and parity sign-off

Deploy the Vite frontend to static hosting and Supabase migrations/functions separately. Cloudflare is the current frontend deployment target; no Docker or long-running PHP server is needed. Keep deployment secrets separate from public Supabase configuration.

Run the full parity matrix across desktop mouse, trackpad, supported touch/mobile layouts, keyboard, nested views, and large records. Check bundle/global CSS isolation, loading/error states, ownership, export/import, and account deletion handling. Keep the repository private.

Acceptance:

- Reference comparison covers every interaction in the visual contract, not only the initial screen.
- Fresh account → create space → add collection/group/item → customize fields/colors/skills → prompt action → reload works on the hosted origin.
- Production setup and deploy steps are reproducible, without containers.

## Implementation sequence

Start with Phase 1 only after plan review. Do not redesign the canvas to simplify the port. Before starting, capture the current Solayana revision and baseline scenes; list the files to copy and the minimal adapter changes. Report each phase's checks and remaining parity gaps before moving to the next phase.
