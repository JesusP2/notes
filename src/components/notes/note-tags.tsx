import { Folder, Plus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Node } from "@/db/schema/graph";
import { ROOT_TAG_ID } from "@/hooks/use-current-user";
import { useNodeMutations, useNoteTags, useTags } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";

interface NoteTagsProps {
  noteId: string;
}

export function NoteTags({ noteId }: NoteTagsProps) {
  const allTags = useTags();
  const noteTags = useNoteTags(noteId);
  const { addTag, removeTag } = useNodeMutations();
  const [open, setOpen] = useState(false);

  const noteTagIds = new Set(noteTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !noteTagIds.has(t.id) && t.id !== ROOT_TAG_ID);

  const handleAddTag = (tag: Node) => {
    addTag(noteId, tag.id);
  };

  const handleRemoveTag = (tag: Node) => {
    removeTag(noteId, tag.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {noteTags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
          <Folder className="size-3" />
          {tag.title}
          {noteTags.length > 0 && (
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
              aria-label={`Remove tag ${tag.title}`}
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-5 gap-1 px-1.5 text-xs text-muted-foreground"
            />
          }
        >
          <Plus className="size-3" />
          {noteTags.length === 0 && "Add tag"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-1">
          {availableTags.length === 0 ? (
            <div className="px-2 py-1.5 text-muted-foreground text-xs">
              {allTags.length === 0
                ? "No tags yet. Create one in the sidebar."
                : "All tags already added."}
            </div>
          ) : (
            <div className="flex flex-col">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    handleAddTag(tag);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs",
                    "hover:bg-muted focus:bg-muted outline-none",
                  )}
                >
                  <Folder className="size-3 text-muted-foreground" />
                  {tag.title}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
