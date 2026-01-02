import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 3,
  name: "user_scoped_graph",
  up: async (db: PGlite) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      INSERT INTO users (id, username, created_at, updated_at)
      VALUES ('local', 'local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE nodes ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local';
      ALTER TABLE nodes ADD COLUMN IF NOT EXISTS excerpt TEXT;

      ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;
      ALTER TABLE nodes
        ADD CONSTRAINT nodes_type_check
        CHECK (type IN ('note', 'tag', 'template', 'canvas'));

      ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_user_id_fkey;
      ALTER TABLE nodes
        ADD CONSTRAINT nodes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

      ALTER TABLE edges ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'local';

      ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_type_check;
      ALTER TABLE edges
        ADD CONSTRAINT edges_type_check
        CHECK (type IN (
          'part_of',
          'references',
          'supports',
          'contradicts',
          'related_to',
          'tagged_with',
          'embeds',
          'derived_from'
        ));

      ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_user_id_fkey;
      ALTER TABLE edges
        ADD CONSTRAINT edges_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

      ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_source_id_target_id_type_key;
      ALTER TABLE edges DROP CONSTRAINT IF EXISTS unique_edge;
      ALTER TABLE edges
        ADD CONSTRAINT unique_edge_user
        UNIQUE (user_id, source_id, target_id, type);

      DROP INDEX IF EXISTS idx_nodes_type;
      CREATE INDEX IF NOT EXISTS idx_nodes_user ON nodes(user_id);
      CREATE INDEX IF NOT EXISTS idx_nodes_user_type ON nodes(user_id, type);

      DROP INDEX IF EXISTS idx_edges_source;
      DROP INDEX IF EXISTS idx_edges_target;
      DROP INDEX IF EXISTS idx_edges_type;
      CREATE INDEX IF NOT EXISTS idx_edges_user ON edges(user_id);
      CREATE INDEX IF NOT EXISTS idx_edges_user_source ON edges(user_id, source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_user_target ON edges(user_id, target_id);
      CREATE INDEX IF NOT EXISTS idx_edges_user_type ON edges(user_id, type);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_part_of_source
        ON edges(user_id, source_id)
        WHERE type = 'part_of';

      CREATE TABLE IF NOT EXISTS edge_metadata (
        edge_id TEXT PRIMARY KEY REFERENCES edges(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS user_node_prefs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
        pinned_rank INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE (user_id, node_id)
      );

      CREATE TABLE IF NOT EXISTS templates_meta (
        node_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        default_tags JSONB,
        last_used_at TIMESTAMP,
        fields JSONB
      );

      CREATE TABLE IF NOT EXISTS node_versions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by TEXT,
        reason TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        block_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_done BOOLEAN DEFAULT FALSE NOT NULL,
        checked_at TIMESTAMP,
        due_at TIMESTAMP,
        priority INTEGER,
        position INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS canvas_scenes (
        canvas_id TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        elements_json JSONB NOT NULL,
        app_state_json JSONB NOT NULL,
        files_json JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS canvas_links (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        element_id TEXT NOT NULL,
        node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_edge_metadata_user ON edge_metadata(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_node_prefs_user ON user_node_prefs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_node_prefs_favorite ON user_node_prefs(user_id, is_favorite);
      CREATE INDEX IF NOT EXISTS idx_user_node_prefs_pinned ON user_node_prefs(user_id, pinned_rank);
      CREATE INDEX IF NOT EXISTS idx_templates_meta_user ON templates_meta(user_id);
      CREATE INDEX IF NOT EXISTS idx_node_versions_user ON node_versions(user_id);
      CREATE INDEX IF NOT EXISTS idx_node_versions_node ON node_versions(node_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_note ON tasks(note_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(user_id, is_done);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(user_id, due_at);
      CREATE INDEX IF NOT EXISTS idx_canvas_scenes_user ON canvas_scenes(user_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_links_canvas ON canvas_links(canvas_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_links_node ON canvas_links(node_id);
      CREATE INDEX IF NOT EXISTS idx_canvas_links_user ON canvas_links(user_id);
    `);
  },
};
