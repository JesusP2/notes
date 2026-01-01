import { FolderIcon } from "lucide-react";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>Root</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </aside>
  );
}
