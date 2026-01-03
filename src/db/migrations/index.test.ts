import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/db/migrations";

describe("runMigrations", () => {
  it("creates the migrations table and records migrations", async () => {
    const db = await PGlite.create();
    await runMigrations(db);

    const result = await db.query<{ name: string }>(
      "SELECT name FROM _migrations ORDER BY version",
    );

    expect(result.rows.map((row) => row.name)).toEqual([
      "initial_schema",
      "seed_root_tag",
      "user_scoped_graph",
      "todos",
      "user_settings_id",
    ]);
  });

  it("skips already-applied migrations", async () => {
    const db = await PGlite.create();
    await runMigrations(db);
    await runMigrations(db);

    const result = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM _migrations",
    );

    expect(result.rows[0]?.count).toBe(5);
  });

  it("seeds the root tag", async () => {
    const db = await PGlite.create();
    await runMigrations(db);

    const result = await db.query<{ id: string; type: string; title: string }>(
      "SELECT id, type, title FROM nodes WHERE id = $1",
      ["root"],
    );

    expect(result.rows[0]).toEqual({
      id: "root",
      type: "tag",
      title: "#root",
    });
  });
});
