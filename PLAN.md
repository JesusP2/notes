# Notes App Plan (Next 5 Features)

This plan covers five high-impact additions:
1) Wiki-link autocomplete
2) Backlinks panel
3) Recent notes in the command palette
4) Shortcut remapping + reset
5) Export note (Markdown + PDF)

Assumptions:
- No schema changes needed (uses existing nodes/edges model).
- Avoid overriding browser-reserved shortcuts.
- Follow current UI patterns and keep changes in `src/` only.

---

## 1) Wiki-link autocomplete (`[[` … `]]`)

Goal: Suggest notes while typing `[[`, allow quick insert, and allow fast creation.

Steps:
1. Add a CodeMirror extension/plugin to detect when the user is inside a `[[...` token.
2. Query notes by title as the user types (limit, debounce).
3. Render a floating suggestion list near the cursor.
4. Insert the selected note title as `[[Title]]`.
5. Offer "Create note" when no match exists and insert `[[New Title]]` after creation.

Files:
- New: `src/components/notes/wiki-link-autocomplete.tsx` (or similar)
- Update: `src/components/notes/note-editor.tsx` to wire the extension
- Update: `src/lib/graph-hooks` or add a small `useNoteTitleSearch` helper

Tests:
- Unit tests for parsing current token and insertion behavior.
- UI test for suggestion list selection.

---

## 2) Backlinks panel (references to current note)

Goal: Show all notes that reference the current note (`references` edges).

Steps:
1. Add a query to fetch backlinks by note id (join `edges` -> `nodes`).
2. Render a compact backlinks section in the note view (collapsible).
3. Refresh backlinks after `syncWikiLinks` completes or when a note is opened.

Files:
- New: `src/components/notes/backlinks-panel.tsx`
- Update: `src/routes/_/notes/$noteId.tsx` to load and pass backlinks
- Update: `src/components/notes/wiki-link-plugin.tsx` to trigger refresh (if needed)

Tests:
- Query returns expected backlinks.
- Panel renders empty state when there are no backlinks.

---

## 3) Recent notes in command palette

Goal: Show recent notes when the command palette is opened with an empty query.

Steps:
1. Add a query/hook for recent notes (order by `updated_at`, limit 10).
2. In `CommandPalette`, show "Recent Notes" when query is empty.
3. Keep existing command groups visible or place them after recent notes.

Files:
- Update: `src/components/command-palette/command-palette.tsx`
- Add or update helper in `src/lib/graph-hooks` (e.g. `useRecentNotes`)

Tests:
- Empty query renders recent notes list.
- Selecting a recent note navigates to it.

---

## 4) Shortcut remapping + reset

Goal: Allow users to remap shortcuts safely and reset to defaults.

Steps:
1. Introduce a persisted shortcuts store (localStorage or indexed DB).
2. Merge overrides with `SHORTCUTS` defaults at runtime.
3. Add a settings UI to edit shortcuts with conflict detection.
4. Block browser-reserved combos and show warnings.
5. Add "Reset to defaults" action.

Files:
- New: `src/lib/shortcut-settings.ts` (store + helpers)
- Update: `src/lib/shortcuts.ts` to expose defaults + active map
- Update: `src/components/help/shortcuts-dialog.tsx` (optional: show active)
- Update: `src/routes/_/settings.tsx` to add remap UI

Tests:
- Round-trip save/load for overrides.
- Conflict detection and reset behavior.

---

## 5) Export note (Markdown + PDF)

Goal: Let users export the current note content.

Steps:
1. Add "Export Markdown" and "Export PDF" actions (details dialog or context menu).
2. Markdown export: save the raw note content to a `.md` file.
3. PDF export: render the markdown to HTML and use `window.print()` with print styles.
4. Ensure filenames are safe and include note title + date.

Files:
- Update: `src/components/notes/note-details-dialog.tsx` or context menu
- New: `src/lib/export-note.ts` (helpers for download/print)
- Optional: `src/styles/print.css` if we want custom print styling

Tests:
- Unit tests for filename sanitization.
- Manual verification for PDF output.

---

## Suggested Order
1. Recent notes in command palette (quick win)
2. Wiki-link autocomplete
3. Backlinks panel
4. Export note
5. Shortcut remapping + reset
