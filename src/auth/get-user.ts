import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { contextMiddleware } from "@/shared/middleware";

export const getUser = createServerFn()
  .middleware([contextMiddleware])
  .handler(async ({ context }) => {
    const headers = getRequestHeaders();
    const session = await context.auth.api.getSession({
      headers,
    });
    if (!session?.session) {
      const { response: anonymousUser, headers: responseHeaders } =
        await context.auth.api.signInAnonymous({
          headers,
          returnHeaders: true,
        });
      setResponseHeader(
        "Set-Cookie",
        responseHeaders.get("set-cookie") as string
      );
      if (!anonymousUser?.user) {
        throw new Error("Failed to get user");
      }
      return {
        ...anonymousUser?.user,
        isAnonymous: true,
      };
    }
    return session.user;
  });
