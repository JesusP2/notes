import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { FileTextIcon, PlusIcon } from "lucide-react";
import type { Node } from "@/db/schema/graph";
import { cn } from "@/lib/tiptap-utils";
import "./wiki-link-list.scss";

export interface WikiLinkSuggestionItem {
  noteId: string;
  title: string;
}

export interface WikiLinkListProps extends SuggestionProps<WikiLinkSuggestionItem> {
  onCreateNote?: (title: string) => Promise<Node | null>;
}

export interface WikiLinkListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const WikiLinkList = forwardRef<WikiLinkListRef, WikiLinkListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { items, command, query, onCreateNote } = props;
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const hasCreateOption =
    query.trim().length > 0 &&
    !items.some((item) => item.title.toLowerCase() === query.trim().toLowerCase());
  const totalItems = items.length + (hasCreateOption ? 1 : 0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const element = itemRefs.current.get(selectedIndex);
    element?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectItem = (index: number) => {
    if (index < items.length) {
      const item = items[index];
      if (item) {
        command({ noteId: item.noteId, title: item.title });
      }
    } else if (hasCreateOption && onCreateNote) {
      const trimmedQuery = query.trim();
      onCreateNote(trimmedQuery).then((newNote) => {
        if (newNote) {
          command({ noteId: newNote.id, title: newNote.title });
        }
      });
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) => (prev + totalItems - 1) % totalItems);
  };

  const downHandler = () => {
    setSelectedIndex((prev) => (prev + 1) % totalItems);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (totalItems === 0) {
    return (
      <div className="wiki-link-list">
        <div className="wiki-link-list-empty">No notes found</div>
      </div>
    );
  }

  return (
    <div className="wiki-link-list">
      {items.map((item, index) => (
        <button
          key={item.noteId}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(index, el);
            } else {
              itemRefs.current.delete(index);
            }
          }}
          type="button"
          className={cn(
            "wiki-link-list-item",
            index === selectedIndex && "wiki-link-list-item-selected",
          )}
          onClick={() => selectItem(index)}
        >
          <FileTextIcon className="wiki-link-list-item-icon" />
          <span className="wiki-link-list-item-title">{item.title}</span>
        </button>
      ))}
      {hasCreateOption && (
        <button
          ref={(el) => {
            if (el) {
              itemRefs.current.set(items.length, el);
            } else {
              itemRefs.current.delete(items.length);
            }
          }}
          type="button"
          className={cn(
            "wiki-link-list-item wiki-link-list-item-create",
            items.length === selectedIndex && "wiki-link-list-item-selected",
          )}
          onClick={() => selectItem(items.length)}
        >
          <PlusIcon className="wiki-link-list-item-icon" />
          <span className="wiki-link-list-item-title">Create "{query.trim()}"</span>
        </button>
      )}
    </div>
  );
});

WikiLinkList.displayName = "WikiLinkList";
