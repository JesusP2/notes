import { usePGlite } from "@electric-sql/pglite-react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useUser } from "@/auth/use-user";

export const DEFAULT_USER_ID = "local";
export const ROOT_TAG_ID = "root";

type CurrentUser = {
  id: string;
  username: string;
};

const CurrentUserContext = createContext<CurrentUser>({
  id: DEFAULT_USER_ID,
  username: DEFAULT_USER_ID,
});

function resolveUsername(user?: {
  name?: string | null;
  email?: string | null;
  id?: string | null;
}) {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email.split("@")[0] ?? email;
  return user?.id ?? DEFAULT_USER_ID;
}

async function migrateLocalUser(db: ReturnType<typeof usePGlite>, userId: string) {
  const tables = [
    "nodes",
    "edges",
    "edge_metadata",
    "user_settings",
    "user_node_prefs",
    "templates_meta",
    "node_versions",
    "tasks",
    "canvas_scenes",
    "canvas_links",
  ];

  for (const table of tables) {
    await db.query(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [
      userId,
      DEFAULT_USER_ID,
    ]);
  }

  await db.query("DELETE FROM users WHERE id = $1", [DEFAULT_USER_ID]);
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const db = usePGlite();
  const { data: user } = useUser();
  const userId = user?.id ?? DEFAULT_USER_ID;
  const username = resolveUsername(user);

  const value = useMemo(
    () => ({
      id: userId,
      username,
    }),
    [userId, username],
  );

  useEffect(() => {
    if (!db) return;

    const ensureUser = async () => {
      await db.query(
        `INSERT INTO users (id, username, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET username = EXCLUDED.username,
             updated_at = CURRENT_TIMESTAMP`,
        [userId, username],
      );

      if (userId !== DEFAULT_USER_ID) {
        await migrateLocalUser(db, userId);
      }

      await db.query(
        `INSERT INTO nodes (id, user_id, type, title, created_at, updated_at)
         VALUES ($1, $2, 'tag', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             title = EXCLUDED.title,
             updated_at = CURRENT_TIMESTAMP`,
        [ROOT_TAG_ID, userId, "#root"],
      );
    };

    void ensureUser();

    return undefined;
  }, [db, userId, username]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export function useCurrentUserId() {
  return useCurrentUser().id;
}
