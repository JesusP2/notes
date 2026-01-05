import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashCommand, SlashCommandCategory } from "@/lib/slash-commands";
import { CATEGORY_LABELS } from "@/lib/slash-commands";
import { cn } from "@/lib/tiptap-utils";
import "./slash-command-menu.scss";

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SuggestionProps<SlashCommand>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { items, command } = props;
    const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const element = itemRefs.current.get(selectedIndex);
      element?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-command-menu">
          <div className="slash-command-menu-empty">No commands found</div>
        </div>
      );
    }

    const grouped = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<SlashCommandCategory, SlashCommand[]>,
    );

    let globalIndex = 0;

    return (
      <div className="slash-command-menu">
        {Object.entries(grouped).map(([category, commands]) => (
          <div key={category} className="slash-command-group">
            <div className="slash-command-group-label">
              {CATEGORY_LABELS[category as SlashCommandCategory]}
            </div>
            {commands.map((item) => {
              const currentIndex = globalIndex++;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) {
                      itemRefs.current.set(currentIndex, el);
                    } else {
                      itemRefs.current.delete(currentIndex);
                    }
                  }}
                  type="button"
                  className={cn(
                    "slash-command-item",
                    currentIndex === selectedIndex && "slash-command-item-selected",
                  )}
                  onClick={() => selectItem(currentIndex)}
                >
                  <Icon className="slash-command-item-icon" />
                  <div className="slash-command-item-content">
                    <span className="slash-command-item-label">{item.label}</span>
                    <span className="slash-command-item-description">{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  },
);

SlashCommandMenu.displayName = "SlashCommandMenu";
