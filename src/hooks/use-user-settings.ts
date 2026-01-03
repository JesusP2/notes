import { useLiveQuery } from "@tanstack/react-db";
import { and, eq } from "@tanstack/db";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { userSettingsCollection } from "@/lib/collections";

function parseValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
  return value as T;
}

export function useUserSetting<T>(
  key: string,
  defaultValue: T,
): [T, (next: T) => Promise<void>, () => Promise<void>] {
  const userId = useCurrentUserId();

  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ userSettings: userSettingsCollection })
        .where(({ userSettings }) =>
          and(eq(userSettings.userId, userId), eq(userSettings.key, key)),
        ),
    [userId, key],
  );

  const setting = data[0];
  const value = parseValue(setting?.value, defaultValue);

  const setValue = async (next: T) => {
    const id = `${userId}:${key}`;
    const now = new Date();
    const state = await userSettingsCollection.stateWhenReady();
    const existing = state.get(id);

    const tx = existing
      ? userSettingsCollection.update(id, (draft) => {
          draft.value = next;
          draft.updatedAt = now;
        })
      : userSettingsCollection.insert({
          id,
          userId,
          key,
          value: next,
          createdAt: now,
          updatedAt: now,
        });

    await tx.isPersisted.promise;
  };

  const clearValue = async () => {
    const id = `${userId}:${key}`;
    const state = await userSettingsCollection.stateWhenReady();
    const existing = state.get(id);
    if (!existing) return;

    const tx = userSettingsCollection.delete(id);
    await tx.isPersisted.promise;
  };

  return [value, setValue, clearValue];
}
