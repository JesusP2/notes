import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { CATEGORY_LABELS, getShortcutsByCategory, type ShortcutCategory } from "@/lib/shortcuts";

const CATEGORY_ORDER: ShortcutCategory[] = ["navigation", "notes", "editor", "view", "help"];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const shortcutsByCategory = getShortcutsByCategory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Quick access to navigation, editing, and view commands.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const shortcuts = shortcutsByCategory.get(category) ?? [];
            if (shortcuts.length === 0) return null;

            return (
              <section key={category} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                  <span>{CATEGORY_LABELS[category]}</span>
                  <Badge variant="secondary">{shortcuts.length}</Badge>
                </div>
                <div className="space-y-1">
                  {shortcuts.map((shortcut) => (
                    <div key={shortcut.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <ShortcutHint shortcut={shortcut} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
