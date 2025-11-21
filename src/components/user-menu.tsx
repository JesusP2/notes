import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, Settings, User } from "lucide-react";
import { authClient } from "@/auth/client";
import { isUserAuthenticated, useUser } from "@/auth/use-user";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { data: user } = useUser();

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  if (!isUserAuthenticated(user)) {
    return (
      <Link
        className={cn(
          buttonVariants({ variant: "default", size: "sm" }),
          "gap-2"
        )}
        params={{ id: "sign-in" }}
        to="/auth/$id"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2"
        )}
      >
        <User className="h-4 w-4" />
        {user.name || user.email || "User"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link className="flex w-full items-center gap-2" to="/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
