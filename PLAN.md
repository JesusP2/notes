# Graph-Based Note-Taking App - Implementation Plan

## Overview

A graph-based note-taking system where **notes**, **folders**, and **tags** are all nodes connected by typed edges. Features a tree view (default) and force-directed graph visualization.

---

## Design Decisions Summary

### Data Model

| Decision | Choice |
|----------|--------|
| Node types | Notes + Folders + Tags |
| Root structure | Single root folder (all content nested under it) |
| Note placement | Every note MUST be in at least one folder |
| Edge direction | Directed (A→B ≠ B→A) |
| Default edge type | `references` (user can change to semantic types) |

### Edge Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `part_of` | child → parent | Folder hierarchy |
| `tagged_with` | note → tag | Tag associations |
| `references` | note → note | Generic link (default) |
| `supports` | note → note | Semantic: supports argument |
| `contradicts` | note → note | Semantic: contradicts argument |
| `related_to` | note → note | Semantic: loosely related |

### Tree View Behavior

| Behavior | Implementation |
|----------|----------------|
| Tags display | Tags shown as "virtual folders" - clicking expands to show tagged notes |
| Multi-parent notes | Note appears under EACH parent folder separately |
| Folder deletion | If note in 2+ folders: remove from this folder only. If note in 1 folder: prompt to move to root or delete |
| New note creation | Auto-navigate to editor immediately after creation |
| Drag and drop | Full DnD: move notes between folders (no custom reorder) |
| Sort order | Type + alphabetical (folders first, then notes, alphabetically within each) |

### Note Editor

| Feature | Implementation |
|---------|----------------|
| Editor type | Full markdown editor (use existing `markdown-editor.tsx`) |
| Connections panel | Right sidebar panel showing outgoing links, backlinks, tags, parent folders |
| Auto-save | Debounced save on every change (no explicit save button) |
| Wiki-links | Support `[[note title]]` syntax in markdown, auto-creates `references` edge |

### Graph View

| Feature | Implementation |
|---------|----------------|
| Scope | Show ALL nodes at once (no local graph mode initially) |
| Node click | Show preview popup; click popup to navigate to note |
| Node style | Colored circles by type (note=blue, folder=amber, tag=green) |

### Layout

| Feature | Implementation |
|---------|----------------|
| Structure | Sidebar (tree) + Main (editor/graph) |
| Sidebar | Resizable using react-resizable-panels (already installed) |

### Technical Stack

| Component | Technology |
|-----------|------------|
| Browser DB | PGlite with IndexedDB persistence |
| ORM | Drizzle ORM with PGlite adapter |
| Query pattern | Use `sql` template tag, extract string/params for `useLiveQuery` |
| Graph viz | react-force-graph-2d |
| Search | Basic search by title and content |

---

## Database Schema

### Drizzle Schema (`src/db/schema/graph.ts`)

```typescript
import { pgTable, text, timestamp, unique, index } from "drizzle-orm/pg-core";

// Node types: 'note' | 'folder' | 'tag'
export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'note' | 'folder' | 'tag'
  title: text("title").notNull(),
  content: text("content"), // Only for notes
  color: text("color"), // Optional custom color
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Edge types: 'part_of' | 'tagged_with' | 'references' | 'supports' | 'contradicts' | 'related_to'
export const edges = pgTable("edges", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_edge").on(table.sourceId, table.targetId, table.type),
  index("idx_edges_source").on(table.sourceId),
  index("idx_edges_target").on(table.targetId),
  index("idx_edges_type").on(table.type),
]);

// TypeScript types
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;

export type NodeType = "note" | "folder" | "tag";
export type EdgeType = "part_of" | "tagged_with" | "references" | "supports" | "contradicts" | "related_to";
```

### Migration System

**Versioned migrations for PGlite** - Each migration has a version number and runs only once.

**Migration table:**
```sql
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Migration files (`src/db/migrations/`):**

```
src/db/migrations/
├── index.ts           # Migration runner
├── 001_initial.ts     # Create nodes + edges tables
└── 002_seed_root.ts   # Create root folder
```

**Migration runner (`src/db/migrations/index.ts`):**

```typescript
import type { PGlite } from "@electric-sql/pglite";

interface Migration {
  version: number;
  name: string;
  up: (db: PGlite) => Promise<void>;
}

// Import all migrations
import { migration as m001 } from "./001_initial";
import { migration as m002 } from "./002_seed_root";

const migrations: Migration[] = [m001, m002];

export async function runMigrations(db: PGlite): Promise<void> {
  // Create migrations table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // Get applied migrations
  const applied = await db.query<{ version: number }>(
    "SELECT version FROM _migrations ORDER BY version"
  );
  const appliedVersions = new Set(applied.rows.map((r) => r.version));

  // Run pending migrations in order
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await db.query(
        "INSERT INTO _migrations (version, name) VALUES ($1, $2)",
        [migration.version, migration.name]
      );
      console.log(`Migration ${migration.version} complete`);
    }
  }
}
```

**Migration 001 (`src/db/migrations/001_initial.ts`):**

```typescript
import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 1,
  name: "initial_schema",
  up: async (db: PGlite) => {
    await db.exec(`
      -- Nodes table: notes, folders, tags
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('note', 'folder', 'tag')),
        title TEXT NOT NULL,
        content TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Edges table: relationships between nodes
      CREATE TABLE edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('part_of', 'tagged_with', 'references', 'supports', 'contradicts', 'related_to')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(source_id, target_id, type)
      );

      -- Indexes for efficient queries
      CREATE INDEX idx_edges_source ON edges(source_id);
      CREATE INDEX idx_edges_target ON edges(target_id);
      CREATE INDEX idx_edges_type ON edges(type);
      CREATE INDEX idx_nodes_type ON nodes(type);
    `);
  },
};
```

**Migration 002 (`src/db/migrations/002_seed_root.ts`):**

```typescript
import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 2,
  name: "seed_root_folder",
  up: async (db: PGlite) => {
    await db.query(
      `INSERT INTO nodes (id, type, title, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      ["root", "folder", "Root"]
    );
  },
};
```

### PGlite Initialization (`src/lib/pglite.ts`)

```typescript
import { PGlite, type PGliteInterfaceExtensions } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { drizzle } from "drizzle-orm/pglite";
import { runMigrations } from "@/db/migrations";
import * as schema from "@/db/schema/graph";

type PGliteWithLive = PGlite & PGliteInterfaceExtensions<{ live: typeof live }>;

let dbInstance: PGliteWithLive | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

export async function initDb(): Promise<{
  pglite: PGliteWithLive;
  db: ReturnType<typeof drizzle>;
}> {
  if (dbInstance && drizzleInstance) {
    return { pglite: dbInstance, db: drizzleInstance };
  }

  // Create PGlite instance with IndexedDB persistence
  dbInstance = (await PGlite.create({
    dataDir: "idb://notes-graph-db",
    extensions: { live },
  })) as PGliteWithLive;

  // Run versioned migrations
  await runMigrations(dbInstance);

  // Create Drizzle instance for type-safe queries
  drizzleInstance = drizzle(dbInstance, { schema });

  return { pglite: dbInstance, db: drizzleInstance };
}

// For client-side initialization
export const dbPromise = typeof window !== "undefined" ? initDb() : null;
```

---

## Testing Strategy

### Philosophy: Loose TDD

Write tests **first** when:
- Logic is complex (graph traversal, migration runner, edge creation)
- Code affects multiple parts (hooks, state management)
- Business rules are critical (folder deletion, multi-parent handling)

Write tests **after** when:
- UI is exploratory (trying different layouts)
- Simple CRUD with obvious behavior
- Prototyping new features

### Tech Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner |
| @testing-library/react | Component testing |
| vitest-browser-mode | Real browser testing (no jsdom simulation) |
| Playwright | Browser driver for vitest + E2E tests |

### Install Dependencies

```bash
bun add -D vitest @vitest/browser playwright @testing-library/react @testing-library/dom
```

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Use browser mode for real DOM testing
    browser: {
      enabled: true,
      provider: "playwright",
      name: "chromium",
      headless: true,
    },
    // Include patterns
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Setup files
    setupFiles: ["./src/test/setup.ts"],
    // Global test timeout
    testTimeout: 10000,
  },
});
```

### Test Setup (`src/test/setup.ts`)

```typescript
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IndexedDB for PGlite tests (if needed in isolation)
// In browser mode, real IndexedDB is available
```

### Playwright E2E Config (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "bun dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test File Structure

```
src/
├── db/
│   └── migrations/
│       ├── index.ts
│       ├── index.test.ts         # Unit: migration runner logic
│       └── 001_initial.test.ts   # Unit: schema validation
├── lib/
│   ├── graph-hooks.ts
│   └── graph-hooks.test.ts       # Unit: hook behavior with real PGlite
├── components/
│   ├── tree/
│   │   ├── folder-tree.tsx
│   │   └── folder-tree.test.tsx  # Component: render, expand/collapse
│   └── notes/
│       ├── note-editor.tsx
│       └── note-editor.test.tsx  # Component: auto-save, wiki-links
e2e/
├── notes.spec.ts                 # E2E: create, edit, delete notes
├── tree-navigation.spec.ts       # E2E: folder navigation
├── graph.spec.ts                 # E2E: graph visualization
└── fixtures/
    └── seed-data.ts              # Seed data for E2E tests
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### What to Test First (TDD)

**Phase 1 - Database (HIGH priority for TDD):**
```typescript
// src/db/migrations/index.test.ts
describe("Migration Runner", () => {
  it("creates _migrations table if not exists");
  it("runs pending migrations in version order");
  it("skips already-applied migrations");
  it("records migration in _migrations after success");
  it("stops on migration failure (no partial state)");
});

// src/lib/graph-hooks.test.ts
describe("useFolderChildren", () => {
  it("returns empty array for empty folder");
  it("returns direct children only (not grandchildren)");
  it("sorts folders first, then notes, alphabetically");
  it("updates when child is added");
  it("updates when child is removed");
});

describe("useNodeMutations", () => {
  it("createNote creates node + part_of edge to parent");
  it("deleteNode removes node and all its edges");
  it("deleteNode handles multi-parent notes correctly");
});
```

**Phase 3 - Tree View (MEDIUM priority for TDD):**
```typescript
// src/components/tree/folder-tree.test.tsx
describe("FolderTree", () => {
  it("renders root folder children");
  it("expands folder on click");
  it("collapses folder on second click");
  it("shows note in multiple locations if multi-parent");
  it("navigates to note on click");
});

describe("TreeContextMenu", () => {
  it("shows correct options for folder");
  it("shows correct options for note");
  it("creates note in correct folder");
});
```

**Phase 4 - Note Editor (MEDIUM priority for TDD):**
```typescript
// src/components/notes/note-editor.test.tsx
describe("NoteEditor", () => {
  it("loads note content on mount");
  it("auto-saves after debounce period");
  it("detects [[wiki-links]] in content");
  it("creates edge for new wiki-link on save");
  it("removes edge for deleted wiki-link on save");
});
```

### E2E Test Scenarios

```typescript
// e2e/notes.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Notes", () => {
  test("create and edit a note", async ({ page }) => {
    await page.goto("/");

    // Create note via context menu
    await page.getByRole("button", { name: "Root" }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "New Note" }).click();

    // Should navigate to editor
    await expect(page).toHaveURL(/\/notes\/.+/);

    // Edit title and content
    await page.getByRole("textbox", { name: "Title" }).fill("My First Note");
    await page.getByRole("textbox", { name: "Content" }).fill("Hello world");

    // Wait for auto-save
    await page.waitForTimeout(600);

    // Refresh and verify persistence
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("My First Note");
  });

  test("link two notes together", async ({ page }) => {
    // ... create two notes, link them, verify in graph
  });
});

// e2e/tree-navigation.spec.ts
test.describe("Tree Navigation", () => {
  test("folder expand/collapse persists", async ({ page }) => {
    // ... expand folder, refresh, verify still expanded
  });

  test("drag note to different folder", async ({ page }) => {
    // ... drag and drop, verify note moved
  });
});
```

### Test Helpers

```typescript
// src/test/helpers.ts
import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/db/migrations";

// Create fresh in-memory PGlite for each test
export async function createTestDb() {
  const db = await PGlite.create(); // In-memory, no persistence
  await runMigrations(db);
  return db;
}

// Seed test data
export async function seedTestData(db: PGlite) {
  await db.query(
    "INSERT INTO nodes (id, type, title) VALUES ($1, $2, $3)",
    ["folder-1", "folder", "Test Folder"]
  );
  await db.query(
    "INSERT INTO edges (id, source_id, target_id, type) VALUES ($1, $2, $3, $4)",
    ["edge-1", "folder-1", "root", "part_of"]
  );
  // ... more seed data
}

// Wait for live query to update
export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Coverage Goals

| Area | Target | Rationale |
|------|--------|-----------|
| Migration runner | 100% | Critical for data integrity |
| Graph hooks (mutations) | 90%+ | Core business logic |
| Graph hooks (queries) | 80%+ | Complex queries |
| Tree components | 70%+ | User-facing interactions |
| Note editor | 70%+ | Auto-save, wiki-links |
| Graph visualization | 50%+ | Hard to test, visual |

---

## Implementation Phases

### Phase 1: Database Foundation

**Goal:** Set up PGlite with Drizzle, versioned migrations, and reactive hooks.

**Files to create:**
- `src/db/schema/graph.ts` - Drizzle schema for nodes and edges
- `src/db/migrations/index.ts` - Migration runner
- `src/db/migrations/001_initial.ts` - Create nodes + edges tables
- `src/db/migrations/002_seed_root.ts` - Seed root folder

**Files to modify:**
- `src/lib/pglite.ts` - Add Drizzle integration, run migrations
- `src/routes/_.tsx` - Update to use new db setup

**Hooks to implement (`src/lib/graph-hooks.ts`):**

```typescript
// --- Live Queries (read) ---

// Get all children of a folder (notes and subfolders)
function useFolderChildren(folderId: string): Node[]

// Get single node by ID
function useNodeById(nodeId: string): Node | null

// Get all edges for a node (both outgoing and incoming)
function useNodeEdges(nodeId: string): { outgoing: Edge[], incoming: Edge[] }

// Get all nodes and edges (for graph view)
function useGraphData(): { nodes: Node[], edges: Edge[] }

// Search nodes by title/content
function useSearchNodes(query: string): Node[]

// Get all tags
function useTags(): Node[]

// Get all notes with a specific tag
function useTaggedNotes(tagId: string): Node[]

// --- Mutations (write) ---

function useNodeMutations(): {
  createNote: (title: string, parentFolderId: string) => Promise<Node>
  createFolder: (title: string, parentFolderId: string) => Promise<Node>
  createTag: (title: string) => Promise<Node>
  updateNode: (id: string, updates: Partial<Node>) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  moveNode: (nodeId: string, newParentId: string) => Promise<void>
}

function useEdgeMutations(): {
  createEdge: (sourceId: string, targetId: string, type: EdgeType) => Promise<Edge>
  deleteEdge: (edgeId: string) => Promise<void>
  changeEdgeType: (edgeId: string, newType: EdgeType) => Promise<void>
}
```

**Pattern for live queries with Drizzle:**

```typescript
import { useLiveQuery } from "@electric-sql/pglite-react";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const dialect = new PgDialect();

// Helper to convert Drizzle sql template to useLiveQuery format
function sqlToQuery(query: ReturnType<typeof sql>) {
  const compiled = dialect.sqlToQuery(query);
  return {
    sql: compiled.sql,
    params: compiled.params as unknown[],
  };
}

function useFolderChildren(folderId: string) {
  // Build query with Drizzle sql template
  // Sort: folders first, then notes, alphabetically within each
  const query = sql`
    SELECT n.* FROM nodes n
    JOIN edges e ON n.id = e.source_id
    WHERE e.target_id = ${folderId} AND e.type = 'part_of'
    ORDER BY
      CASE n.type WHEN 'folder' THEN 0 ELSE 1 END,
      LOWER(n.title) ASC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);

  return useLiveQuery<Node>(sqlString, params);
}
```

---

### Phase 2: App Layout

**Goal:** Set up resizable sidebar layout with tree placeholder.

**Files to modify:**
- `src/routes/_.tsx` - Wrap with SidebarProvider, add resizable layout

**Layout structure:**

```tsx
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

<PanelGroup direction="horizontal" autoSaveId="app-layout">
  <Panel defaultSize={20} minSize={15} maxSize={40}>
    <AppSidebar>
      {/* Tree view goes here */}
    </AppSidebar>
  </Panel>
  <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20" />
  <Panel>
    <Outlet /> {/* Editor or graph view */}
  </Panel>
</PanelGroup>
```

**Files to create:**
- `src/components/layout/app-sidebar.tsx` - Main sidebar wrapper with resize handle

**Resizable implementation:**
- Use `react-resizable-panels` (already installed in package.json)
- Store sidebar width preference in localStorage
- Use `PanelGroup`, `Panel`, `PanelResizeHandle` components

---

### Phase 3: Tree View

**Goal:** Implement folder/note tree with expand/collapse, context menu.

**Files to create:**

```
src/components/tree/
├── folder-tree.tsx         # Main tree component
├── tree-node.tsx           # Individual tree item (folder/note/tag)
├── tree-context-menu.tsx   # Right-click menu
├── tree-dnd.tsx            # Drag-and-drop logic
└── tags-section.tsx        # Tags displayed as expandable section
```

**Tree Node component (`tree-node.tsx`):**

```tsx
interface TreeNodeProps {
  node: Node;
  level: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

// Uses SidebarMenuButton, SidebarMenuSub for nested items
// Shows different icons: FolderIcon, FileTextIcon, TagIcon
// Shows expand/collapse chevron for folders
// Shows multi-parent indicator if note appears in 2+ folders
```

**Context menu actions:**
- **Folder:** New Note, New Folder, Rename, Delete
- **Note:** Open, Add to Folder..., Remove from Folder, Rename, Delete
- **Tag:** Rename, Delete

**Drag and drop:**
- Drag note/folder to another folder → create/update `part_of` edge
- Visual drop indicator showing valid drop targets
- Reorder within folder (requires sort_order field - consider adding)

---

### Phase 4: Note CRUD & Editor

**Goal:** Create/read/update/delete notes with markdown editor.

**Files to create:**

```
src/routes/_/
├── notes/
│   └── $noteId.tsx         # Note editor route

src/components/notes/
├── note-editor.tsx         # Main editor with title + content
├── note-sidebar.tsx        # Right panel: connections, tags, folders
└── wiki-link-plugin.tsx    # Parse [[links]] in markdown
```

**Note editor route (`src/routes/_/notes/$noteId.tsx`):**

```tsx
export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { outgoing, incoming } = useNodeEdges(noteId);
  const { updateNode } = useNodeMutations();

  // Auto-save with debounce
  const debouncedSave = useDebouncedCallback((content: string) => {
    updateNode(noteId, { content, updatedAt: new Date() });
  }, 500);

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <NoteEditor
          note={note}
          onChange={debouncedSave}
        />
      </div>
      <NoteSidebar
        note={note}
        outgoingEdges={outgoing}
        incomingEdges={incoming}
      />
    </div>
  );
}
```

**Wiki-link parsing:**
- Parse `[[note title]]` in markdown content
- On save, extract all wiki-links
- Create `references` edges for each link
- Remove edges for deleted links
- Show unresolved links (no matching note) with different style

---

### Phase 5: Edge Creation UI

**Goal:** Allow users to manually create and manage edges between nodes.

**Files to create:**

```
src/components/edges/
├── link-dialog.tsx         # Modal for creating links
├── edge-type-select.tsx    # Dropdown for edge types
└── node-search.tsx         # Combobox to search/select target node
```

**Link dialog flow:**

1. User clicks "Link to..." button in note sidebar
2. Dialog opens with:
   - Search input to find target note
   - Edge type dropdown (default: "references")
   - Direction indicator (from current note → target)
3. User selects target and type
4. Edge created, dialog closes
5. UI updates via live query

**Edge type descriptions:**

| Type | Description shown to user |
|------|---------------------------|
| `references` | Links to this note |
| `supports` | Provides evidence or support for |
| `contradicts` | Disagrees with or contradicts |
| `related_to` | Is loosely related to |

---

### Phase 6: Graph Visualization

**Goal:** Force-directed graph showing all nodes and edges.

**Install dependency:**
```bash
bun add react-force-graph-2d
```

**Files to create:**

```
src/routes/_/graph.tsx              # Graph view route

src/components/graph/
├── graph-view.tsx                  # Main graph component
├── graph-node-preview.tsx          # Popup when clicking node
└── graph-controls.tsx              # Zoom, filter controls (optional)
```

**Graph data transformation:**

```typescript
function useGraphData() {
  const nodes = useLiveQuery<Node>("SELECT * FROM nodes");
  const edges = useLiveQuery<Edge>("SELECT * FROM edges");

  // Transform to react-force-graph format
  return {
    nodes: nodes?.rows.map(n => ({
      id: n.id,
      name: n.title,
      type: n.type,
      color: n.type === 'note' ? '#3b82f6'
           : n.type === 'folder' ? '#f59e0b'
           : '#22c55e',
    })),
    links: edges?.rows.map(e => ({
      source: e.sourceId,
      target: e.targetId,
      type: e.type,
    })),
  };
}
```

**Graph component:**

```tsx
import ForceGraph2D from "react-force-graph-2d";

function GraphView() {
  const data = useGraphData();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  return (
    <div className="relative h-full w-full">
      <ForceGraph2D
        graphData={data}
        nodeColor={node => node.color}
        nodeLabel={node => node.name}
        onNodeClick={(node) => setSelectedNode(node)}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
      />
      {selectedNode && (
        <GraphNodePreview
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNavigate={() => navigate(`/notes/${selectedNode.id}`)}
        />
      )}
    </div>
  );
}
```

---

### Phase 7: Search

**Goal:** Basic search by title and content.

**Files to create:**

```
src/components/search/
├── search-dialog.tsx       # Cmd+K search dialog
└── search-results.tsx      # List of matching nodes
```

**Search implementation:**

```typescript
function useSearchNodes(query: string) {
  const searchQuery = sql`
    SELECT * FROM nodes
    WHERE title ILIKE ${'%' + query + '%'}
       OR content ILIKE ${'%' + query + '%'}
    ORDER BY updated_at DESC
    LIMIT 20
  `;

  return useLiveQuery(searchQuery.toSQL().sql, searchQuery.toSQL().params);
}
```

**Search dialog:**
- Open with `Cmd+K` keyboard shortcut
- Show recent notes when query is empty
- Filter results by type (notes, folders, tags)
- Navigate to selected result

---

## File Structure (Final)

```
src/
├── db/
│   ├── schema/
│   │   ├── auth.ts           # Existing auth schema
│   │   └── graph.ts          # NEW: nodes + edges schema
│   └── migrations/           # NEW: versioned migrations
│       ├── index.ts          # Migration runner
│       ├── index.test.ts     # TEST: Migration runner
│       ├── 001_initial.ts    # Create tables
│       └── 002_seed_root.ts  # Seed root folder
├── lib/
│   ├── pglite.ts             # MODIFY: Add Drizzle, new tables
│   ├── graph-hooks.ts        # NEW: All graph-related hooks
│   ├── graph-hooks.test.ts   # TEST: Hook behavior
│   └── utils.ts              # Existing
├── test/                     # NEW: Test utilities
│   ├── setup.ts              # Vitest setup
│   └── helpers.ts            # Test helpers (createTestDb, etc.)
├── components/
│   ├── ui/                   # Existing shadcn components
│   ├── tree/                 # NEW
│   │   ├── folder-tree.tsx
│   │   ├── folder-tree.test.tsx   # TEST
│   │   ├── tree-node.tsx
│   │   ├── tree-context-menu.tsx
│   │   ├── tree-dnd.tsx
│   │   └── tags-section.tsx
│   ├── notes/                # NEW
│   │   ├── note-editor.tsx
│   │   ├── note-editor.test.tsx   # TEST
│   │   ├── note-sidebar.tsx
│   │   └── wiki-link-plugin.tsx
│   ├── edges/                # NEW
│   │   ├── link-dialog.tsx
│   │   ├── edge-type-select.tsx
│   │   └── node-search.tsx
│   ├── graph/                # NEW
│   │   ├── graph-view.tsx
│   │   └── graph-node-preview.tsx
│   ├── search/               # NEW
│   │   ├── search-dialog.tsx
│   │   └── search-results.tsx
│   └── layout/               # NEW
│       └── app-sidebar.tsx
├── routes/
│   ├── __root.tsx            # Existing
│   ├── _.tsx                 # MODIFY: Add sidebar layout
│   ├── _/                    # NEW: Protected routes
│   │   ├── index.tsx         # Dashboard / recent notes
│   │   ├── graph.tsx         # Graph view
│   │   └── notes/
│   │       └── $noteId.tsx   # Note editor
│   └── auth.$id.tsx          # Existing
└── hooks/
    └── use-debounce.ts       # NEW: For auto-save

# Root level files
vitest.config.ts              # NEW: Vitest configuration
playwright.config.ts          # NEW: Playwright E2E config

# E2E tests (outside src/)
e2e/
├── notes.spec.ts             # E2E: Note CRUD
├── tree-navigation.spec.ts   # E2E: Tree interactions
├── graph.spec.ts             # E2E: Graph view
└── fixtures/
    └── seed-data.ts          # Seed data for tests
```

---

## Implementation Order

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Database schema + hooks | None |
| 2 | App layout (resizable sidebar) | Phase 1 |
| 3 | Tree view (folders, notes, tags) | Phase 1, 2 |
| 4 | Note CRUD + editor | Phase 1, 3 |
| 5 | Edge creation UI | Phase 1, 4 |
| 6 | Graph visualization | Phase 1, 4 |
| 7 | Search | Phase 1, 4 |

---

## Testing Checklist

### Phase 1 - Database

**Unit Tests (TDD - write first):**
- [ ] `runMigrations` creates _migrations table if not exists
- [ ] `runMigrations` runs pending migrations in version order
- [ ] `runMigrations` skips already-applied migrations
- [ ] `runMigrations` records migration after success
- [ ] `useFolderChildren` returns direct children only
- [ ] `useFolderChildren` sorts folders first, then notes
- [ ] `useNodeMutations.createNote` creates node + edge
- [ ] `useNodeMutations.deleteNode` handles multi-parent

**Manual Verification:**
- [ ] PGlite initializes with IndexedDB persistence
- [ ] Data persists after page refresh
- [ ] Console shows migration logs on first load

### Phase 3 - Tree View

**Component Tests:**
- [ ] `FolderTree` renders root folder children
- [ ] `FolderTree` expands/collapses folders
- [ ] `TreeNode` shows correct icon per type
- [ ] `TreeContextMenu` shows correct options per type
- [ ] Multi-parent note shows indicator

**E2E Tests:**
- [ ] Create folder via context menu
- [ ] Create note via context menu
- [ ] Drag note to different folder
- [ ] Delete folder with confirmation

### Phase 4 - Note Editor

**Component Tests (TDD for wiki-links):**
- [ ] `NoteEditor` loads note content
- [ ] `NoteEditor` auto-saves after debounce
- [ ] `parseWikiLinks` extracts [[links]] from content
- [ ] Wiki-link creates edge on save
- [ ] Removing wiki-link removes edge on save

**E2E Tests:**
- [ ] Create note, edit, verify persistence
- [ ] Type [[link]], verify edge created
- [ ] Navigate via wiki-link

### Phase 6 - Graph

**Component Tests:**
- [ ] `GraphView` renders all nodes
- [ ] Nodes have correct colors by type
- [ ] Click node shows preview

**E2E Tests:**
- [ ] Navigate to graph view
- [ ] Click node, verify preview
- [ ] Click preview, navigate to note

---

## Future Enhancements (Not in v1)

- AI-suggested edge types based on content
- Local graph view (N-level connections from current note)
- Export to markdown/JSON
- Server sync with PostgreSQL
- Collaborative editing
- Version history
