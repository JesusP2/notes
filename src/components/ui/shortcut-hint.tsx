import { formatShortcut, type ShortcutDefinition } from "@/lib/shortcuts";
import { usePlatform } from "@/lib/use-shortcut";
import { Kbd } from "./kbd";

interface ShortcutHintProps {
  shortcut: ShortcutDefinition;
  className?: string;
}

export function ShortcutHint({ shortcut, className }: ShortcutHintProps) {
  const platform = usePlatform();
  const formatted = formatShortcut(shortcut, platform);

  return <Kbd className={className}>{formatted}</Kbd>;
}
