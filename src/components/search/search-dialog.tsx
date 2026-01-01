import { useNavigate } from "@tanstack/react-router";
import { FileText, Folder, Network, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Node } from "@/db/schema/graph";
import { useSearchNodes } from "@/lib/graph-hooks";

const NODE_ICONS: Record<Node["type"], typeof FileText> = {
  note: FileText,
  folder: Folder,
  tag: Tag,
};

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useSearchNodes(query);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (node: Node) => {
      setOpen(false);
      setQuery("");
      if (node.type === "note") {
        navigate({ to: "/notes/$noteId", params: { noteId: node.id } });
      }
    },
    [navigate],
  );

  const handleNavigateToGraph = useCallback(() => {
    setOpen(false);
    setQuery("");
    navigate({ to: "/graph" });
  }, [navigate]);

  const handleNavigateHome = useCallback(() => {
    setOpen(false);
    setQuery("");
    navigate({ to: "/" });
  }, [navigate]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search for notes, folders, and tags"
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search notes..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {!query && (
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={handleNavigateHome}>
                <FileText className="size-4 text-muted-foreground" />
                <span>Home</span>
              </CommandItem>
              <CommandItem onSelect={handleNavigateToGraph}>
                <Network className="size-4 text-muted-foreground" />
                <span>Graph View</span>
              </CommandItem>
            </CommandGroup>
          )}

          {query && results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Results">
                {results.map((node) => {
                  const Icon = NODE_ICONS[node.type];
                  return (
                    <CommandItem key={node.id} value={node.id} onSelect={() => handleSelect(node)}>
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{node.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {node.type}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
