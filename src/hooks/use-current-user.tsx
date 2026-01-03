import { createContext, useContext, useEffect } from "react";
import { useUser } from "@/auth/use-user";
import {
  canvasLinksCollection,
  canvasScenesCollection,
  edgeMetadataCollection,
  edgesCollection,
  nodeVersionsCollection,
  nodesCollection,
  tasksCollection,
  templatesMetaCollection,
  todosCollection,
  userNodePrefsCollection,
  userSettingsCollection,
  usersCollection,
} from "@/lib/collections";

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

function migrateLocalUser(userId: string) {
  const now = new Date();

  const updateUserId = (collection: any, mutateDraft?: (draft: any) => void) => {
    const entries = Array.from(collection.state.entries()) as Array<[string, any]>;
    const keys = entries
      .filter(([, value]) => value.userId === DEFAULT_USER_ID)
      .map(([key]) => String(key));

    if (keys.length === 0) return;

    collection.update(keys, (drafts: any[]) => {
      drafts.forEach((draft) => {
        draft.userId = userId;
        mutateDraft?.(draft);
      });
    });
  };

  updateUserId(nodesCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(edgesCollection);
  updateUserId(edgeMetadataCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(userSettingsCollection, (draft) => {
    (draft as { id?: string; key?: string; updatedAt?: Date }).id = `${userId}:${
      (draft as { key?: string }).key ?? ""
    }`;
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(userNodePrefsCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(templatesMetaCollection);
  updateUserId(nodeVersionsCollection);
  updateUserId(tasksCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(todosCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(canvasScenesCollection, (draft) => {
    (draft as { updatedAt?: Date }).updatedAt = now;
  });
  updateUserId(canvasLinksCollection);

  if (usersCollection.state.get(DEFAULT_USER_ID)) {
    usersCollection.delete(DEFAULT_USER_ID);
  }
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const userId = user?.id ?? DEFAULT_USER_ID;
  const username = resolveUsername(user);

  const value = {
    id: userId,
    username,
  };

  useEffect(() => {
    const now = new Date();
    const existingUser = usersCollection.state.get(userId);

    if (existingUser) {
      usersCollection.update(userId, (draft) => {
        draft.username = username;
        draft.updatedAt = now;
      });
    } else {
      usersCollection.insert({
        id: userId,
        username,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (userId !== DEFAULT_USER_ID) {
      migrateLocalUser(userId);
    }

    const existingRoot = nodesCollection.state.get(ROOT_TAG_ID);
    if (existingRoot) {
      nodesCollection.update(ROOT_TAG_ID, (draft) => {
        draft.userId = userId;
        draft.title = "#root";
        draft.type = "tag";
        draft.updatedAt = now;
      });
    } else {
      nodesCollection.insert({
        id: ROOT_TAG_ID,
        userId,
        type: "tag",
        title: "#root",
        content: null,
        excerpt: null,
        color: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return undefined;
  }, [userId, username]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export function useCurrentUserId() {
  return useCurrentUser().id;
}
