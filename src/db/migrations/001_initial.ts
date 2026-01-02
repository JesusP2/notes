import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 1,
  name: "initial_schema",
  up: async (db: PGlite) => {
    await db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('note', 'tag')),
        title TEXT NOT NULL,
        content TEXT,
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN (
          'part_of',
          'references',
          'supports',
          'contradicts',
          'related_to'
        )),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(source_id, target_id, type)
      );

      CREATE INDEX idx_edges_source ON edges(source_id);
      CREATE INDEX idx_edges_target ON edges(target_id);
      CREATE INDEX idx_edges_type ON edges(type);
      CREATE INDEX idx_nodes_type ON nodes(type);
    `);
  },
};
