import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserMenu } from "@/components/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useUser, useUserQueryOptions } from "@/auth/use-user";
import { useLiveQuery } from "@tanstack/react-db";
import { userSettingsCollection } from "@/user-settings/collection";
import { ulid } from "ulidx";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(useUserQueryOptions)
    if (!user || user.isAnonymous) {
      throw redirect({
        to: "/"
      });
    }
  },
});

function SettingsPage() {
  const userQuery = useUser();
  const query = useLiveQuery(q => q.from({ userSettingsCollection }).findOne())
  const settings = query.data

  const onToggle = (checked: boolean) => {
    if (!settings) {
      userSettingsCollection.insert({
        id: ulid(),
        user_id: userQuery.data.id,
        enable_ai: checked,
      })
    } else {
      userSettingsCollection.update(settings.id, draft => {
        draft.enable_ai = checked
      })
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-3xl">App Settings</h1>
        </div>
        <UserMenu />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>AI Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-q-rephrase" className="text-base">
                Enable AI Question Rephrasing
              </Label>
              <p className="text-muted-foreground text-sm">
                When enabled, questions may be rephrased using AI for variety.
                Requires internet.
              </p>
            </div>
            <Switch
              id="ai-q-rephrase"
              checked={!!settings?.enable_ai}
              onCheckedChange={onToggle}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
