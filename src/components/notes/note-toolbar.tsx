import { Info, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Node } from "@/db/schema/graph";
import { SHORTCUTS } from "@/lib/shortcuts";

interface NoteToolbarProps {
  note: Node | null;
  onOpenDetails: () => void;
  onLinkTo: () => void;
  onDelete: () => void;
}

export function NoteToolbar({
  note,
  onOpenDetails,
  onLinkTo,
  onDelete,
}: NoteToolbarProps) {
  if (!note) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-sm font-medium truncate">{note.title}</h1>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
            onClick={onOpenDetails}
            aria-label="Open note details"
          >
            <Info className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Note Details</span>
            <ShortcutHint shortcut={SHORTCUTS.NOTE_DETAILS} />
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
            onClick={onLinkTo}
            aria-label="Link to another note"
          >
            <Link2 className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Link to...</span>
            <ShortcutHint shortcut={SHORTCUTS.LINK_TO} />
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
              />
            }
            onClick={onDelete}
            aria-label="Delete note"
          >
            <Trash2 className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Delete Note</span>
            <ShortcutHint shortcut={SHORTCUTS.DELETE_NOTE} />
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
