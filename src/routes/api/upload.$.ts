import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/auth/server";
import { uploadRouter } from "@/shared/file-storage";
import { storage } from "@/shared/file-storage/async-storage";

export const Route = createFileRoute("/api/upload/$")({
	server: {
		handlers: {
			GET: async ({ request }) => uploadRouter.handlers.GET(request),
			POST: async ({ request }) => {
				const auth = getAuth();
				const session = await auth.api.getSession(request);
				return storage.run(session?.session.userId, async () =>
					uploadRouter.handlers.POST(request),
				);
			},
		},
	},
});
