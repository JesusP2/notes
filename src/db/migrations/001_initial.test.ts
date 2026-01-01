import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { migration } from "./001_initial";

describe("001_initial", () => {
  it("creates nodes and edges tables", async () => {
    const db = await PGlite.create();
    await migration.up(db);

    await db.query("SELECT id FROM nodes LIMIT 0");
    await db.query("SELECT id FROM edges LIMIT 0");
  });

  it("enforces unique edges", async () => {
    const db = await PGlite.create();
    await migration.up(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Note 1"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Note 2"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-1", "note-1", "note-2", "references"],
    );

    await expect(
      db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-2", "note-1", "note-2", "references"],
      ),
    ).rejects.toBeTruthy();
  });
});
