import { usePGlite, useLiveQuery } from "@electric-sql/pglite-react";
import { useCallback, useMemo } from "react";
import { useCurrentUserId } from "@/hooks/use-current-user";

function parseValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function useUserSetting<T>(
  key: string,
  defaultValue: T,
): [T, (next: T) => Promise<void>, () => Promise<void>] {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const result = useLiveQuery<{ value: unknown }>(
    "SELECT value FROM user_settings WHERE user_id = $1 AND key = $2 LIMIT 1",
    [userId, key],
  );

  const value = useMemo(
    () => parseValue(result?.rows[0]?.value, defaultValue),
    [result?.rows, defaultValue],
  );

  const setValue = useCallback(
    async (next: T) => {
      const payload = JSON.stringify(next);
      await db.query(
        `INSERT INTO user_settings (user_id, key, value, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = CURRENT_TIMESTAMP`,
        [userId, key, payload],
      );
    },
    [db, userId, key],
  );

  const clearValue = useCallback(async () => {
    await db.query("DELETE FROM user_settings WHERE user_id = $1 AND key = $2", [userId, key]);
  }, [db, userId, key]);

  return [value, setValue, clearValue];
}
