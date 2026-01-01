import { PGlite, type PGliteInterfaceExtensions } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { drizzle } from "drizzle-orm/pglite";
import { runMigrations } from "@/db/migrations";
import * as schema from "@/db/schema/graph";

type PGliteWithLive = PGlite & PGliteInterfaceExtensions<{ live: typeof live }>;

let pgliteInstance: PGliteWithLive | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

export async function initDb(): Promise<{
  pglite: PGliteWithLive;
  db: ReturnType<typeof drizzle>;
}> {
  if (pgliteInstance && drizzleInstance) {
    return { pglite: pgliteInstance, db: drizzleInstance };
  }

  pgliteInstance = (await PGlite.create({
    dataDir: "idb://notes-graph-db",
    extensions: { live },
  })) as PGliteWithLive;

  await runMigrations(pgliteInstance);

  drizzleInstance = drizzle(pgliteInstance, { schema });

  return { pglite: pgliteInstance, db: drizzleInstance };
}

export const dbPromise = typeof window !== "undefined" ? initDb() : null;
