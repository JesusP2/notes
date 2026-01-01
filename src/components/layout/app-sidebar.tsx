import { FolderIcon } from "lucide-react";
import { FolderTree } from "@/components/tree/folder-tree";
import { TagsSection } from "@/components/tree/tags-section";
import { SidebarContent, SidebarHeader, SidebarSeparator } from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderIcon className="size-4" />
          Notes Graph
        </div>
        <p className="text-muted-foreground text-xs">Tree view coming next.</p>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <div className="space-y-4 py-2">
          <FolderTree />
          <SidebarSeparator />
          <TagsSection />
        </div>
      </SidebarContent>
    </aside>
  );
}
