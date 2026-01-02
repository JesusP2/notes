import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppSettings } from "@/components/providers/app-settings";
import { ShortcutEditor } from "@/components/settings/shortcut-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isSidebarCollapsed, toggleSidebar, vimEnabled, setVimEnabled } = useAppSettings();
  const themeValue = theme ?? "system";

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="max-w-3xl mx-auto w-full px-8 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="size-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how the app looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="settings-theme">Theme</Label>
                <p className="text-muted-foreground text-xs">Light, dark, or follow system.</p>
              </div>
              <Select value={themeValue} onValueChange={(value) => value && setTheme(value)}>
                <SelectTrigger id="settings-theme" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layout</CardTitle>
            <CardDescription>Customize the workspace layout.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="settings-sidebar">Sidebar</Label>
                <p className="text-muted-foreground text-xs">
                  Show or hide the navigation sidebar.
                </p>
              </div>
              <Switch
                id="settings-sidebar"
                checked={!isSidebarCollapsed}
                onCheckedChange={(checked) => {
                  if (checked === !isSidebarCollapsed) return;
                  toggleSidebar();
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
            <CardDescription>Adjust editor behavior.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="settings-vim">Vim mode</Label>
                <p className="text-muted-foreground text-xs">Use vim keybindings in the editor.</p>
              </div>
              <Switch
                id="settings-vim"
                checked={vimEnabled}
                onCheckedChange={(checked) => {
                  setVimEnabled(checked);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <ShortcutEditor />
      </div>
    </div>
  );
}
