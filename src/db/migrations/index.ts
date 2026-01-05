import type { PGlite } from "@electric-sql/pglite";
import { migration as m001 } from "./001_initial";
import { migration as m002 } from "./002_seed_root";
import { migration as m003 } from "./003_user_scoped_graph";
import { migration as m004 } from "./004_todos";
import { migration as m005 } from "./005_user_settings_id";
import { migration as m006 } from "./006_images";

interface Migration {
  version: number;
  name: string;
  up: (db: PGlite) => Promise<void>;
}

const migrations: Migration[] = [m001, m002, m003, m004, m005, m006];

export async function runMigrations(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  const applied = await db.query<{ version: number }>(
    "SELECT version FROM _migrations ORDER BY version",
  );
  const appliedVersions = new Set(applied.rows.map((row) => row.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await db.query("INSERT INTO _migrations (version, name) VALUES ($1, $2)", [
        migration.version,
        migration.name,
      ]);
      console.log(`Migration ${migration.version} complete`);
    }
  }
}
