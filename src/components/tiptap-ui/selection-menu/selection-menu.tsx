import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import "./selection-menu.scss";

import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Separator } from "@/components/tiptap-ui-primitive/separator";

interface SelectionMenuProps {
  editor: Editor;
}

export function SelectionMenu({ editor }: SelectionMenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!editor.isFocused || editor.state.selection.empty || editor.isActive("codeBlock")) {
        setPosition(null);
        return;
      }

      try {
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) {
          setPosition(null);
          return;
        }

        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) {
          setPosition(null);
          return;
        }

        const editorRect = editor.view.dom.getBoundingClientRect();

        const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 40;
        setPosition({
          top: rect.top - editorRect.top - menuHeight - 8,
          left: rect.left - editorRect.left + rect.width / 2,
        });
      } catch (e) {
        console.warn("Error calculating selection menu position", e);
        setPosition(null);
      }
    };

    const handleSelectionUpdate = () => {
      if (editor.state.selection.empty) {
        setPosition(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      const startPos = mouseDownPosRef.current;
      isMouseDownRef.current = false;
      mouseDownPosRef.current = null;

      const CLICK_THRESHOLD = 5;
      const isClick =
        startPos &&
        Math.abs(e.clientX - startPos.x) < CLICK_THRESHOLD &&
        Math.abs(e.clientY - startPos.y) < CLICK_THRESHOLD;

      if (isClick) {
        setPosition(null);
        return;
      }

      requestAnimationFrame(() => {
        updatePosition();
      });
    };

    const handleKeyUp = () => {
      if (!editor.state.selection.empty) {
        setPosition(null);
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    const editorDom = editor.view.dom;
    editorDom.addEventListener("mousedown", handleMouseDown);
    editorDom.addEventListener("mouseup", handleMouseUp);
    editorDom.addEventListener("keyup", handleKeyUp);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editorDom.removeEventListener("mousedown", handleMouseDown);
      editorDom.removeEventListener("mouseup", handleMouseUp);
      editorDom.removeEventListener("keyup", handleKeyUp);
    };
  }, [editor]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="selection-menu"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <ButtonGroup orientation="horizontal">
        <MarkButton editor={editor} type="bold" tooltip="Bold" />
        <MarkButton editor={editor} type="italic" tooltip="Italic" />
        <MarkButton editor={editor} type="strike" tooltip="Strikethrough" />
        <MarkButton editor={editor} type="code" tooltip="Code" />
      </ButtonGroup>

      <Separator orientation="vertical" />

      <ButtonGroup orientation="horizontal">
        <ColorHighlightPopover editor={editor} />
        <LinkPopover editor={editor} />
      </ButtonGroup>
    </div>
  );
}
