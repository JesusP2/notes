import { useNavigate } from "@tanstack/react-router";
import { FileText, Tag } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { Node } from "@/db/schema/graph";
import { COMMANDS, COMMAND_GROUP_LABELS, getThemeIcon, type CommandDefinition } from "@/lib/commands";
import { useSearchNodes } from "@/lib/graph-hooks";
import { formatShortcut, SHORTCUTS } from "@/lib/shortcuts";
import { usePlatform, useShortcut } from "@/lib/use-shortcut";

const NODE_ICONS: Record<Node["type"], typeof FileText> = {
  note: FileText,
  tag: Tag,
};

interface CommandPaletteProps {
  onCreateNote: () => void;
  onCreateTag: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onShowShortcuts: () => void;
  isDarkMode?: boolean;
}

export function CommandPalette({
  onCreateNote,
  onCreateTag,
  onToggleSidebar,
  onToggleTheme,
  onShowShortcuts,
  isDarkMode = false,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const platform = usePlatform();
  const results = useSearchNodes(query);

  useShortcut(SHORTCUTS.COMMAND_PALETTE, () => setOpen((prev) => !prev));

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  }, []);

  const handleSelectNode = useCallback(
    (node: Node) => {
      setOpen(false);
      setQuery("");
      if (node.type === "note") {
        navigate({ to: "/notes/$noteId", params: { noteId: node.id } });
      }
    },
    [navigate],
  );

  const commandHandlers: Record<string, () => void> = useMemo(
    () => ({
      "go-home": () => {
        setOpen(false);
        setQuery("");
        navigate({ to: "/" });
      },
      "graph-view": () => {
        setOpen(false);
        setQuery("");
        navigate({ to: "/graph" });
      },
      "new-note": () => {
        setOpen(false);
        setQuery("");
        onCreateNote();
      },
      "new-tag": () => {
        setOpen(false);
        setQuery("");
        onCreateTag();
      },
      "toggle-sidebar": () => {
        setOpen(false);
        onToggleSidebar();
      },
      "toggle-theme": () => {
        setOpen(false);
        onToggleTheme();
      },
      "show-shortcuts": () => {
        setOpen(false);
        onShowShortcuts();
      },
    }),
    [navigate, onCreateNote, onCreateTag, onToggleSidebar, onToggleTheme, onShowShortcuts],
  );

  const handleSelectCommand = useCallback(
    (command: CommandDefinition) => {
      const handler = commandHandlers[command.id];
      if (handler) {
        handler();
      }
    },
    [commandHandlers],
  );

  const commandsByGroup = useMemo(() => {
    const groups = new Map<CommandDefinition["group"], CommandDefinition[]>();
    for (const command of COMMANDS) {
      const existing = groups.get(command.group) ?? [];
      const displayCommand =
        command.id === "toggle-theme"
          ? { ...command, icon: getThemeIcon(isDarkMode) }
          : command;
      existing.push(displayCommand);
      groups.set(command.group, existing);
    }
    return groups;
  }, [isDarkMode]);

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command Palette"
      description="Search notes and commands"
    >
      <Command shouldFilter={!hasQuery}>
        <CommandInput
          placeholder="Search notes, commands..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {hasQuery && hasResults && (
            <>
              <CommandGroup heading="Notes">
                {results.map((node) => {
                  const Icon = NODE_ICONS[node.type];
                  return (
                    <CommandItem
                      key={node.id}
                      value={`note-${node.id}`}
                      onSelect={() => handleSelectNode(node)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{node.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {node.type}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {Array.from(commandsByGroup.entries()).map(([group, commands]) => (
            <CommandGroup key={group} heading={COMMAND_GROUP_LABELS[group]}>
              {commands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    keywords={command.keywords}
                    onSelect={() => handleSelectCommand(command)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{command.title}</span>
                    {command.shortcut && (
                      <CommandShortcut>
                        {formatShortcut(command.shortcut, platform)}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
