# Graph Notes Plan (Tag-First)

## Purpose
Build a local-first, graph-based notes app that is tag-centric (no folders) with typed semantic links. This document is the source of truth for the data model, constraints, UI behaviors, and feature roadmap.

## Project Layout (source of truth)
- `src/db/schema/graph.ts`: graph schema definitions (nodes/edges and related tables).
- `src/db/migrations/`: ordered schema changes; add new migrations for each schema change.
- `src/lib/graph-hooks.ts`: read/write hooks for nodes/edges and feature queries.
- `src/routes/`: route-level UI and data loaders; follow TanStack Start conventions.
- `src/components/` + `src/components/ui`: feature UI and shared primitives.
- `src/shared/` + `src/hooks/`: cross-cutting helpers and custom hooks.
- `src/routeTree.gen.ts` is generated; never edit directly.

## Data Storage Rules (non-negotiable)
- No `localStorage` or `sessionStorage` for persistent state.
- All persisted settings live in PGlite tables and are scoped to a user.
- Replace current `localStorage` usage:
  - Vim mode toggle in `src/routes/_.tsx`.
  - Shortcut overrides in `src/lib/shortcut-settings.ts`.
  - Layout persistence from `react-resizable-panels` (`autoSaveId` uses localStorage).
  - Theme persistence from `next-themes` (default is localStorage).

## Users
We already have a backend users table; PGlite only stores minimal identity data.
- New `users` table:
  - `id` (text, primary key, matches backend user id).
  - `username` (text, unique, required).
  - Optional `created_at`, `updated_at` for local auditing.
- All user-scoped data references `users.id`.
- Add `user_id` to `nodes`, `edges`, and all feature tables to enforce per-user isolation.

## Core Data Model

### Nodes
`nodes` remains the primary entity table.
- `type`: `note` | `tag` | `template` | `canvas`
- `title`: human-readable label.
- `content`: markdown for notes/templates; optional serialized data for canvas if needed.
- `color`, `created_at`, `updated_at`.
- `user_id`: required; foreign key to `users.id`.
- Optional future columns: `excerpt` (preview cache), `icon`, `content_format`.

### Edges
`edges` expresses typed relationships between nodes.
- Core types: `part_of` (tag hierarchy parent), `references` (wiki links), `supports`, `contradicts`, `related_to`.
- Planned additions: `tagged_with` (note -> tag), `embeds` (transclusion), `derived_from` (note -> template).
- `user_id`: required; foreign key to `users.id` (matches source/target ownership).
- Add `edge_metadata` table for per-edge data (embed anchors, positions).

### Root Tag Constraint
- There is exactly one root tag per user with stable id `root`.
- `part_of` edges are used only between tag nodes to form a tag tree under `root`.
- Tags have exactly one `part_of` parent (except `root`); orphans are not allowed.
- Notes do not require `part_of` edges; they can have zero or many `tagged_with` edges.
- `root` cannot be deleted; tag hierarchy cannot create cycles.

### Tag Tree + Graph UI Behaviors
- Tree view shows the tag hierarchy (tags only).
- Selecting a tag lists notes via `tagged_with` edges.
- Graph view renders `references`, `supports`, `contradicts`, `related_to`, `embeds`. `part_of` is hidden by default.
- Tagging UI is many-to-many; notes can belong to multiple tags (including none).

## Feature Specs

### Note preview on hover
- Behavior: Hovering a note link or sidebar item shows a card with title, last updated, tags, and first lines of content.
- Implementation:
  - Add a `NotePreviewCard` component using a hover-card/popover primitive.
  - Fetch a lightweight preview query (title, updated_at, excerpt) with a short debounce.
  - Cache previews in memory to avoid refetch thrash.
- Schema impact:
  - Optional `nodes.excerpt` column updated on save (fast preview).
  - No new tables required if preview is derived from content.

### Split / multi-pane view
- Behavior: Users can split the workspace into 2-3 panes, each pane showing a note, the graph, or the canvas.
- Implementation:
  - Add a layout manager component with resizable panes (horizontal/vertical).
  - Persist layout in PGlite (no `autoSaveId` in localStorage).
  - Pane routing can be driven by query params (e.g. `?panes=a,b`).
- Schema impact:
  - `user_settings` table (or key/value table) storing layout JSON by `user_id`.
  - No graph changes required.

### Favorites / Pinned notes
- Behavior: Star favorites for quick access; pin notes and/or tags to a fixed order.
- Implementation:
  - Add toggle actions in note list and tag tree.
  - Sidebar gets "Pinned" + "Favorites" sections.
  - Use a dedicated query to fetch pinned in rank order and favorites by updated time.
- Schema impact:
  - New `user_node_prefs` table:
    - `user_id`, `node_id`, `is_favorite`, `pinned_rank`, `created_at`, `updated_at`.
    - Unique `(user_id, node_id)`; index `(user_id, pinned_rank)` and `(user_id, is_favorite)`.

### Templates
- Behavior: Create notes from reusable templates with placeholders.
- Implementation:
  - Template nodes live in a "Templates" tag or are listed in a template picker.
  - `Create from template` clones content, replaces placeholders (`{{title}}`, `{{date}}`), and applies default tags.
  - Keep a link from the created note back to the template.
- Schema impact:
  - Add `template` to `nodes.type`.
  - Add `derived_from` edge from created note to template node.
  - Optional `templates_meta` table with `user_id`, `node_id`, `default_tags`, `last_used_at`, `fields` (JSON).

### Version history
- Behavior: View and restore prior versions of a note; show diffs.
- Implementation:
  - On save (debounced) or manual snapshot, store a version row.
  - De-dupe by content hash to avoid storing identical versions.
  - History panel shows list + diff view; restore writes a new version.
- Schema impact:
  - New `node_versions` table:
    - `id`, `user_id`, `node_id`, `title`, `content`, `content_hash`, `created_at`, `created_by`, `reason`.
    - Index `(node_id, created_at desc)` and unique `(node_id, content_hash)` (optional).

### Transclusion / Embeds
- Behavior: Embed a note inside another note (`![[Note]]`) with live updates.
- Implementation:
  - Editor parser recognizes embed tokens and creates an `embeds` edge.
  - Render embedded content with a visual wrapper and link back to source.
  - Prevent recursive embeds via max depth and cycle detection.
- Schema impact:
  - Add `embeds` to edge types.
  - Add `edge_metadata` table for block id, render mode, and anchor offsets.
  - Index `(source_id, type)` for fast embed queries.

### Canvas / Whiteboard (Excalidraw)
- Behavior: A freeform board where notes, tags, and stickies can be arranged and connected.
- Implementation:
  - Use `@excalidraw/excalidraw` for the canvas UI.
  - Each `canvas` node stores an Excalidraw scene (elements + app state + files).
  - Map note references to Excalidraw elements via a dedicated linking table.
  - Save/load scene data on debounce; keep a minimal autosave indicator.
- Schema impact:
  - Add `canvas` to `nodes.type`.
  - New `canvas_scenes` table:
    - `user_id`, `canvas_id`, `elements_json`, `app_state_json`, `files_json`, `updated_at`.
    - Index `(canvas_id)`.
  - `canvas_links` table for explicit note/tag links:
    - `id`, `user_id`, `canvas_id`, `element_id`, `node_id`, `created_at`.
    - Index `(canvas_id)` and `(node_id)`.

### Checkbox / Task tracking
- Behavior: Checkbox items in notes are tracked as tasks with status and optional due dates.
- Implementation:
  - Editor inserts stable task ids in markdown (e.g. `- [ ] Task text <!-- task:uuid -->`).
  - On save, parse content and upsert tasks; toggle updates both task row and inline markdown.
  - Task list view filters by status, due date, and tag.
- Schema impact:
  - New `tasks` table:
    - `id`, `user_id`, `note_id`, `block_id`, `content`, `is_done`, `checked_at`, `due_at`, `priority`, `position`, `created_at`, `updated_at`.
    - Index `(note_id)`, `(is_done)`, `(due_at)`.

## Schema Roadmap (phased)

### Phase 1: Core tag model + users
- Add `tagged_with` edges for note-to-tag.
- Constrain `part_of` to tag-to-tag hierarchy with a single `root` tag per user (orphans disallowed).
- Add minimal `users` table and `user_id` to `nodes`/`edges`.
- Add `user_settings` table (key/value or typed columns) to replace localStorage.

### Phase 2: UX + preferences (PGlite only)
- Note preview on hover (optional `excerpt` column).
- Split/multi-pane view with layout persisted in `user_settings`.
- Favorites/pinned (`user_node_prefs` table).
- Migrate all persisted settings off localStorage.

### Phase 3: Templates + history
- `template` node type + `derived_from` edges.
- `node_versions` table and history panel.

### Phase 4: Embeds + tasks
- `embeds` edge type + edge metadata.
- `tasks` table with parsing sync.

### Phase 5: Canvas (Excalidraw)
- `canvas` node type + `canvas_scenes` table.
- Optional linking tables for note/tag relationships in canvas.

## Decisions (resolved)
- Tag hierarchy is required; no orphan tags.
- Everything is user-scoped by default (including tags).
- Use a separate `edge_metadata` table instead of a JSON column on `edges`.
- Use a separate `canvas_links` table for Excalidraw element-to-node links.
