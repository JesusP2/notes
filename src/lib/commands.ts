import {
  HelpCircle,
  Home,
  Moon,
  Network,
  PanelLeft,
  Plus,
  Sun,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { SHORTCUTS, type ShortcutDefinition } from "./shortcuts";

export interface CommandDefinition {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  shortcut?: ShortcutDefinition;
  keywords?: string[];
  group: "navigation" | "notes" | "view" | "help";
}

export const COMMANDS: CommandDefinition[] = [
  {
    id: "go-home",
    title: "Go Home",
    description: "Navigate to home page",
    icon: Home,
    shortcut: SHORTCUTS.GO_HOME,
    keywords: ["home", "index", "start"],
    group: "navigation",
  },
  {
    id: "graph-view",
    title: "Graph View",
    description: "Open the knowledge graph",
    icon: Network,
    shortcut: SHORTCUTS.GRAPH_VIEW,
    keywords: ["graph", "network", "connections", "links"],
    group: "navigation",
  },
  {
    id: "new-note",
    title: "New Note",
    description: "Create a new note",
    icon: Plus,
    shortcut: SHORTCUTS.NEW_NOTE,
    keywords: ["create", "add", "note", "document"],
    group: "notes",
  },
  {
    id: "new-tag",
    title: "New Folder",
    description: "Create a new folder",
    icon: Tag,
    shortcut: SHORTCUTS.NEW_TAG,
    keywords: ["create", "add", "tag", "category", "folder"],
    group: "notes",
  },
  {
    id: "toggle-sidebar",
    title: "Toggle Sidebar",
    description: "Show or hide the sidebar",
    icon: PanelLeft,
    shortcut: SHORTCUTS.TOGGLE_SIDEBAR,
    keywords: ["sidebar", "panel", "hide", "show", "collapse"],
    group: "view",
  },
  {
    id: "toggle-theme",
    title: "Toggle Theme",
    description: "Switch between light and dark mode",
    icon: Sun,
    shortcut: SHORTCUTS.TOGGLE_THEME,
    keywords: ["theme", "dark", "light", "mode", "appearance"],
    group: "view",
  },
  {
    id: "show-shortcuts",
    title: "Keyboard Shortcuts",
    description: "Show all keyboard shortcuts",
    icon: HelpCircle,
    shortcut: SHORTCUTS.SHOW_SHORTCUTS,
    keywords: ["help", "keyboard", "shortcuts", "keys", "hotkeys"],
    group: "help",
  },
];

export const COMMAND_GROUP_LABELS: Record<CommandDefinition["group"], string> = {
  navigation: "Navigation",
  notes: "Notes",
  view: "View",
  help: "Help",
};

export function getCommandsByGroup(): Map<CommandDefinition["group"], CommandDefinition[]> {
  const groups = new Map<CommandDefinition["group"], CommandDefinition[]>();

  for (const command of COMMANDS) {
    const existing = groups.get(command.group) ?? [];
    existing.push(command);
    groups.set(command.group, existing);
  }

  return groups;
}

export function getThemeIcon(isDark: boolean): LucideIcon {
  return isDark ? Sun : Moon;
}
