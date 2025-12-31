import { PGlite, type PGliteInterfaceExtensions } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";

type PGliteWithLive = PGlite & PGliteInterfaceExtensions<{ live: typeof live }>;

let dbInstance: PGliteWithLive | null = null;

export async function getDb(): Promise<PGliteWithLive> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = (await PGlite.create({
    dataDir: "idb://todos-db",
    extensions: { live },
  })) as PGliteWithLive;

  // Initialize todos table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return dbInstance;
}
