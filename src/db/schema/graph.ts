import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const edges = pgTable(
  "edges",
  {
    id: text("id").primaryKey(),
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
    unique("unique_edge").on(table.sourceId, table.targetId, table.type),
    index("idx_edges_source").on(table.sourceId),
    index("idx_edges_target").on(table.targetId),
    index("idx_edges_type").on(table.type),
  ],
);

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;

export type NodeType = "note" | "tag";
export type EdgeType = "part_of" | "references" | "supports" | "contradicts" | "related_to";
