import type { JSONContent } from "@tiptap/core";
import { useRef } from "react";
import { indexNoteEmbeddings } from "./indexer";

const DEBOUNCE_MS = 5000;

interface IndexState {
  timeoutId: ReturnType<typeof setTimeout> | null;
  lastContent: string | null;
}

export function useIndexOnSave() {
  const stateRef = useRef<Map<string, IndexState>>(new Map());

  const scheduleIndex = (
    noteId: string,
    userId: string,
    title: string,
    content: JSONContent | null,
  ) => {
    let state = stateRef.current.get(noteId);
    if (!state) {
      state = { timeoutId: null, lastContent: null };
      stateRef.current.set(noteId, state);
    }

    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    const contentHash = content ? JSON.stringify(content) : "";
    if (state.lastContent === contentHash) {
      return;
    }

    state.timeoutId = setTimeout(async () => {
      try {
        await indexNoteEmbeddings(noteId, userId, title, content);
        const currentState = stateRef.current.get(noteId);
        if (currentState) {
          currentState.lastContent = contentHash;
        }
      } catch (err) {
        console.error(`Failed to index note ${noteId}:`, err);
      }
    }, DEBOUNCE_MS);
  };

  const indexNow = async (
    noteId: string,
    userId: string,
    title: string,
    content: JSONContent | null,
  ) => {
    const state = stateRef.current.get(noteId);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
    }

    try {
      await indexNoteEmbeddings(noteId, userId, title, content);
      const currentState = stateRef.current.get(noteId);
      if (currentState) {
        currentState.lastContent = content ? JSON.stringify(content) : "";
      }
    } catch (err) {
      console.error(`Failed to index note ${noteId}:`, err);
    }
  };

  return { scheduleIndex, indexNow };
}
