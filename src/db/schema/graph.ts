import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const nodes = pgTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    excerpt: text("excerpt"),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_nodes_user").on(table.userId),
    index("idx_nodes_user_type").on(table.userId, table.type),
  ],
);

export const edges = pgTable(
  "edges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("unique_edge_user").on(table.userId, table.sourceId, table.targetId, table.type),
    index("idx_edges_user").on(table.userId),
    index("idx_edges_user_source").on(table.userId, table.sourceId),
    index("idx_edges_user_target").on(table.userId, table.targetId),
    index("idx_edges_user_type").on(table.userId, table.type),
  ],
);

export const edgeMetadata = pgTable("edge_metadata", {
  edgeId: text("edge_id")
    .primaryKey()
    .references(() => edges.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("unique_user_setting").on(table.userId, table.key),
    index("idx_user_settings_user").on(table.userId),
  ],
);

export const userNodePrefs = pgTable(
  "user_node_prefs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    pinnedRank: integer("pinned_rank"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("unique_user_node_pref").on(table.userId, table.nodeId),
    index("idx_user_node_prefs_user").on(table.userId),
    index("idx_user_node_prefs_favorite").on(table.userId, table.isFavorite),
    index("idx_user_node_prefs_pinned").on(table.userId, table.pinnedRank),
  ],
);

export const templatesMeta = pgTable(
  "templates_meta",
  {
    nodeId: text("node_id")
      .primaryKey()
      .references(() => nodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    defaultTags: jsonb("default_tags").$type<string[]>(),
    lastUsedAt: timestamp("last_used_at"),
    fields: jsonb("fields").$type<Record<string, unknown>>(),
  },
  (table) => [index("idx_templates_meta_user").on(table.userId)],
);

export const nodeVersions = pgTable(
  "node_versions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: text("created_by"),
    reason: text("reason"),
  },
  (table) => [
    index("idx_node_versions_node").on(table.nodeId),
    index("idx_node_versions_user").on(table.userId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    noteId: text("note_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    content: text("content").notNull(),
    isDone: boolean("is_done").default(false).notNull(),
    checkedAt: timestamp("checked_at"),
    dueAt: timestamp("due_at"),
    priority: integer("priority"),
    position: integer("position"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("idx_tasks_note").on(table.noteId),
    index("idx_tasks_user").on(table.userId),
    index("idx_tasks_done").on(table.userId, table.isDone),
    index("idx_tasks_due").on(table.userId, table.dueAt),
  ],
);

export const canvasScenes = pgTable(
  "canvas_scenes",
  {
    canvasId: text("canvas_id")
      .primaryKey()
      .references(() => nodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    elementsJson: jsonb("elements_json").notNull().$type<unknown>(),
    appStateJson: jsonb("app_state_json").notNull().$type<Record<string, unknown>>(),
    filesJson: jsonb("files_json").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("idx_canvas_scenes_user").on(table.userId)],
);

export const canvasLinks = pgTable(
  "canvas_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canvasId: text("canvas_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    elementId: text("element_id").notNull(),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_canvas_links_canvas").on(table.canvasId),
    index("idx_canvas_links_node").on(table.nodeId),
    index("idx_canvas_links_user").on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;

export type NodeType = "note" | "tag" | "template" | "canvas";
export type EdgeType =
  | "part_of"
  | "references"
  | "supports"
  | "contradicts"
  | "related_to"
  | "tagged_with"
  | "embeds"
  | "derived_from";
