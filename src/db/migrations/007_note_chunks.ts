import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 7,
  name: "note_chunks_vector_search",
  up: async (db: PGlite) => {
    let hasVectorExtension = false;

    try {
      await db.exec(`CREATE EXTENSION IF NOT EXISTS vector;`);
      hasVectorExtension = true;
    } catch {
      console.warn(
        "pgvector extension not available. Vector search will be disabled.",
      );
    }

    if (hasVectorExtension) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS note_chunks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          note_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL,
          chunk_text TEXT NOT NULL,
          chunk_hash TEXT NOT NULL,
          embedding vector(384),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          UNIQUE (note_id, chunk_index)
        );

        CREATE INDEX IF NOT EXISTS idx_note_chunks_note
          ON note_chunks(note_id);
        CREATE INDEX IF NOT EXISTS idx_note_chunks_user
          ON note_chunks(user_id);
        CREATE INDEX IF NOT EXISTS idx_note_chunks_hash
          ON note_chunks(chunk_hash);
        CREATE INDEX IF NOT EXISTS idx_note_chunks_embedding
          ON note_chunks USING hnsw (embedding vector_cosine_ops);
      `);
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS note_chunks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          note_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL,
          chunk_text TEXT NOT NULL,
          chunk_hash TEXT NOT NULL,
          embedding TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          UNIQUE (note_id, chunk_index)
        );

        CREATE INDEX IF NOT EXISTS idx_note_chunks_note
          ON note_chunks(note_id);
        CREATE INDEX IF NOT EXISTS idx_note_chunks_user
          ON note_chunks(user_id);
        CREATE INDEX IF NOT EXISTS idx_note_chunks_hash
          ON note_chunks(chunk_hash);
      `);
    }
  },
};
