import { AlertCircle, Check, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  findConflict,
  getActiveShortcuts,
  isBrowserReserved,
  loadOverrides,
  resetOverrides,
  saveOverrides,
  type ShortcutOverrides,
} from "@/lib/shortcut-settings";
import {
  CATEGORY_LABELS,
  formatShortcut,
  SHORTCUTS,
  type ShortcutCategory,
  type ShortcutId,
  type ShortcutModifiers,
} from "@/lib/shortcuts";
import { usePlatform } from "@/lib/use-shortcut";
import { cn } from "@/lib/utils";

export function ShortcutEditor() {
  const [overrides, setOverrides] = useState<ShortcutOverrides>({});
  const [editingId, setEditingId] = useState<ShortcutId | null>(null);
  const [pendingKey, setPendingKey] = useState<{
    key: string;
    modifiers: ShortcutModifiers;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const platform = usePlatform();

  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  const activeShortcuts = getActiveShortcuts(overrides);

  const handleStartEdit = (id: ShortcutId) => {
    setEditingId(id);
    setPendingKey(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPendingKey(null);
    setError(null);
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      handleCancelEdit();
      return;
    }

    if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) {
      return;
    }

    const modifiers: ShortcutModifiers = {
      meta: event.metaKey || event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
    };

    setPendingKey({ key: event.key.toLowerCase(), modifiers });
    setError(null);
  }, []);

  const handleSaveShortcut = () => {
    if (!editingId || !pendingKey) return;

    if (isBrowserReserved(pendingKey.key, pendingKey.modifiers)) {
      setError("This shortcut is reserved by the browser");
      return;
    }

    const conflict = findConflict(pendingKey.key, pendingKey.modifiers, editingId, overrides);
    if (conflict) {
      setError(`Conflicts with "${SHORTCUTS[conflict].description}"`);
      return;
    }

    const defaultShortcut = SHORTCUTS[editingId];
    const defaultMods: ShortcutModifiers = defaultShortcut.modifiers ?? {};
    const isDefault =
      pendingKey.key === defaultShortcut.key &&
      !!pendingKey.modifiers.meta === !!defaultMods.meta &&
      !!pendingKey.modifiers.shift === !!defaultMods.shift &&
      !!pendingKey.modifiers.alt === !!defaultMods.alt;

    const newOverrides = { ...overrides };
    if (isDefault) {
      delete newOverrides[editingId];
    } else {
      newOverrides[editingId] = pendingKey;
    }

    setOverrides(newOverrides);
    saveOverrides(newOverrides);
    setEditingId(null);
    setPendingKey(null);
    setError(null);
  };

  const handleResetAll = () => {
    resetOverrides();
    setOverrides({});
    setEditingId(null);
    setPendingKey(null);
    setError(null);
  };

  const handleResetOne = (id: ShortcutId) => {
    const newOverrides = { ...overrides };
    delete newOverrides[id];
    setOverrides(newOverrides);
    saveOverrides(newOverrides);
  };

  const shortcutsByCategory = new Map<ShortcutCategory, ShortcutId[]>();
  for (const id of Object.keys(SHORTCUTS) as ShortcutId[]) {
    const category = SHORTCUTS[id].category;
    const existing = shortcutsByCategory.get(category) ?? [];
    existing.push(id);
    shortcutsByCategory.set(category, existing);
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Keyboard Shortcuts</CardTitle>
            <CardDescription>
              Customize keyboard shortcuts. Changes take effect immediately.
            </CardDescription>
          </div>
          {hasOverrides && (
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="size-4 mr-1" />
              Reset All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from(shortcutsByCategory.entries()).map(([category, ids]) => (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="space-y-1">
              {ids.map((id) => {
                const shortcut = activeShortcuts[id];
                const isEditing = editingId === id;
                const isModified = !!overrides[id];

                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-md",
                      isEditing && "bg-muted",
                    )}
                  >
                    <div className="flex-1">
                      <span className="text-sm">{shortcut.description}</span>
                      {isModified && (
                        <span className="ml-2 text-xs text-muted-foreground">(modified)</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          readOnly
                          className="w-40 text-center font-mono text-sm"
                          placeholder="Press keys..."
                          value={
                            pendingKey
                              ? formatShortcut({ ...shortcut, ...pendingKey }, platform)
                              : ""
                          }
                          onKeyDown={handleKeyDown}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={handleSaveShortcut}
                          disabled={!pendingKey}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={handleCancelEdit}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(id)}
                          className="font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-muted-foreground/20 transition-colors"
                        >
                          {formatShortcut(shortcut, platform)}
                        </button>
                        {isModified && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6"
                            onClick={() => handleResetOne(id)}
                            title="Reset to default"
                          >
                            <RotateCcw className="size-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
