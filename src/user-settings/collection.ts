import { userSettingsSchema } from "@/user-settings/schema";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { createUserSettings, updateUserSettings } from "./rpc";

export const userSettingsCollection = createCollection(
  electricCollectionOptions({
    id: "user-settings",
    shapeOptions: {
      url: `${import.meta.env.VITE_SERVER_URL}/api/electric/user_settings`,
      params: {
        table: "user_settings",
      },
      onError: (error) => {
        console.error(error);
      },
    },
    schema: userSettingsSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      const response = await createUserSettings({
        data: newItem,
      });
      return {
        txid: response.txid,
      };
    },
    onUpdate: async ({ transaction }) => {
      const newItem = transaction.mutations[0].modified;
      const response = await updateUserSettings({
        data: newItem,
      });
      return {
        txid: response.txid,
      };
    },
  })
);
