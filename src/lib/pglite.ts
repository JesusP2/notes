import { PGlite, type PGliteInterfaceExtensions } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema/graph";

type PGliteWithLive = PGlite & PGliteInterfaceExtensions<{ live: typeof live }>;

export const pgliteInstance = new PGlite({
  dataDir: "idb://notes-graph-db",
  extensions: { live },
}) as PGliteWithLive;
console.log('pgliteInstance', pgliteInstance, pgliteInstance.query('select * from todos').then(console.log))
export const drizzleInstance = drizzle(pgliteInstance, { schema })

// runMigrations(pgliteInstance).then(() => console.log('db migrated!')).catch((err) => console.error('could migrate db', err))
