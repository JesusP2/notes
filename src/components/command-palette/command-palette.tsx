import { useNavigate } from "@tanstack/react-router";
import { FilePlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  COMMANDS,
  COMMAND_GROUP_LABELS,
  getThemeIcon,
  type CommandDefinition,
} from "@/lib/commands";
import { formatShortcut, SHORTCUTS } from "@/lib/shortcuts";
import { usePlatform, useShortcut } from "@/lib/use-shortcut";

interface CommandPaletteProps {
  onCreateNote: (title?: string) => void;
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
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const platform = usePlatform();

  useShortcut(SHORTCUTS.COMMAND_PALETTE, () => setOpen((prev) => !prev));

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  }, []);

  const handleCreateNoteWithSearch = useCallback(() => {
    const title = search.trim();
    setOpen(false);
    setSearch("");
    onCreateNote(title || undefined);
  }, [search, onCreateNote]);

  const commandHandlers: Record<string, () => void> = useMemo(
    () => ({
      "go-home": () => {
        setOpen(false);
        navigate({ to: "/" });
      },
      "graph-view": () => {
        setOpen(false);
        navigate({ to: "/graph" });
      },
      "new-note": () => {
        setOpen(false);
        onCreateNote();
      },
      "new-tag": () => {
        setOpen(false);
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
        command.id === "toggle-theme" ? { ...command, icon: getThemeIcon(isDarkMode) } : command;
      existing.push(displayCommand);
      groups.set(command.group, existing);
    }
    return groups;
  }, [isDarkMode]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command Palette"
      description="Execute commands"
    >
      <Command shouldFilter>
        <CommandInput
          placeholder="Type a command..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>

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

          {search.trim() && (
            <CommandGroup forceMount>
              <CommandItem
                value={`create-note-${search}`}
                onSelect={handleCreateNoteWithSearch}
                forceMount
              >
                <FilePlusIcon className="size-4 text-muted-foreground" />
                <span>Create note: "{search.trim()}"</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
