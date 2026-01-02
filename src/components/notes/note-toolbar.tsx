import { Columns2, Edit3, Eye, Info, Keyboard, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Node } from "@/db/schema/graph";
import { SHORTCUTS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

export type NoteViewMode = "edit" | "preview" | "split";

interface NoteToolbarProps {
  note: Node | null;
  onOpenDetails: () => void;
  onLinkTo: () => void;
  onDelete: () => void;
  vimEnabled: boolean;
  onToggleVim: () => void;
  viewMode?: NoteViewMode;
  onViewModeChange?: (mode: NoteViewMode) => void;
}

const VIEW_MODES: Array<{ value: NoteViewMode; label: string; icon: typeof Edit3 }> = [
  { value: "edit", label: "Editor", icon: Edit3 },
  { value: "preview", label: "Preview", icon: Eye },
  { value: "split", label: "Split", icon: Columns2 },
];

export function NoteToolbar({
  note,
  onOpenDetails,
  onLinkTo,
  onDelete,
  vimEnabled,
  onToggleVim,
  viewMode,
  onViewModeChange,
}: NoteToolbarProps) {
  if (!note) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-medium truncate">{note.title}</h1>
        {viewMode && onViewModeChange && (
          <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.value;
              return (
                <Tooltip key={mode.value}>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7",
                          isActive && "bg-background text-foreground shadow-sm",
                        )}
                      />
                    }
                    onClick={() => onViewModeChange(mode.value)}
                    aria-label={`${mode.label} view`}
                    aria-pressed={isActive}
                  >
                    <Icon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>{mode.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", vimEnabled && "bg-muted text-foreground")}
              />
            }
            onClick={onToggleVim}
            aria-label="Toggle Vim mode"
            aria-pressed={vimEnabled}
          >
            <Keyboard className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Vim mode</span>
            <span className="text-muted-foreground">{vimEnabled ? "On" : "Off"}</span>
          </TooltipContent>
        </Tooltip>

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
