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
): [T, (next: T) => void, () => void] {
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

  const setValue = (next: T) => {
    const id = `${userId}:${key}`;
    const now = new Date();
    const existing = userSettingsCollection.state.get(id);

    if (existing) {
      userSettingsCollection.update(id, (draft) => {
        draft.value = next;
        draft.updatedAt = now;
      });
    } else {
      userSettingsCollection.insert({
        id,
        userId,
        key,
        value: next,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const clearValue = () => {
    const id = `${userId}:${key}`;
    const existing = userSettingsCollection.state.get(id);
    if (!existing) return;

    userSettingsCollection.delete(id);
  };

  return [value, setValue, clearValue];
}
