import { Extension } from "@tiptap/react";
import { Plugin, Selection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export type VimModeState = "insert" | "normal";

const DEFAULT_LINE_HEIGHT = 18;
const X_CANDIDATE_OFFSET = 4;

function clampPosition(view: EditorView, pos: number) {
  return Math.max(0, Math.min(pos, view.state.doc.content.size));
}

function moveHorizontal(view: EditorView, direction: -1 | 1) {
  const { state } = view;
  const targetPos = clampPosition(view, state.selection.from + direction);
  const selection = Selection.near(state.doc.resolve(targetPos), direction);
  view.dispatch(state.tr.setSelection(selection));
  view.focus();
  return true;
}

function moveVertical(view: EditorView, direction: -1 | 1) {
  const { state } = view;
  const anchor = state.selection.from;

  try {
    const coords = view.coordsAtPos(anchor);
    const lineHeight = Math.max(coords.bottom - coords.top, DEFAULT_LINE_HEIGHT);
    const targetTop = coords.top + direction * lineHeight;
    const xCandidates = [
      coords.left + X_CANDIDATE_OFFSET,
      (coords.left + coords.right) / 2,
      coords.right - X_CANDIDATE_OFFSET,
    ];

    let target = null;
    for (const left of xCandidates) {
      const found = view.posAtCoords({ left, top: targetTop });
      if (found) {
        target = found;
        break;
      }
    }

    if (!target) return true;

    const selection = Selection.near(state.doc.resolve(target.pos), direction);
    view.dispatch(state.tr.setSelection(selection));
    view.focus();
    return true;
  } catch {
    return true;
  }
}

function deleteChar(view: EditorView) {
  const { state } = view;
  const { from, to, empty } = state.selection;
  const end = empty ? Math.min(state.doc.content.size, from + 1) : to;

  if (end <= from) {
    return true;
  }

  view.dispatch(state.tr.delete(from, end));
  view.focus();
  return true;
}

export const VimModeExtension = Extension.create<{
  enabled: boolean;
  initialMode: VimModeState;
  onModeChange?: (mode: VimModeState) => void;
}>({
  name: "vimMode",

  addOptions() {
    return {
      enabled: false,
      initialMode: "normal" as VimModeState,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      mode: this.options.initialMode as VimModeState,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            const mode = extension.storage.mode as VimModeState;
            const enabled = extension.storage.enabled as boolean;

            if (!enabled) {
              return false;
            }

            const setMode = (nextMode: VimModeState) => {
              if (extension.storage.mode === nextMode) return;
              extension.storage.mode = nextMode;
              extension.options.onModeChange?.(nextMode);
            };

            if (event.key === "Escape") {
              setMode("normal");
              return true;
            }

            if (mode === "insert") {
              return false;
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
              return false;
            }

            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

            switch (key) {
              case "i":
                setMode("insert");
                return true;
              case "h":
                return moveHorizontal(view, -1);
              case "l":
                return moveHorizontal(view, 1);
              case "j":
                return moveVertical(view, 1);
              case "k":
                return moveVertical(view, -1);
              case "x":
                return deleteChar(view);
              default:
                if (["Backspace", "Delete", "Enter", "Tab"].includes(event.key)) {
                  return true;
                }
                return false;
            }
          },
          handleTextInput() {
            const enabled = extension.storage.enabled as boolean;
            if (!enabled) return false;
            return extension.storage.mode === "normal";
          },
        },
      }),
    ];
  },
});
