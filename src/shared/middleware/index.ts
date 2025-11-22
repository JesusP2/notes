import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "@/auth/server";
import { getDb } from "@/db";
import { rateLimit } from "@/rate-limit";

export const contextMiddleware = createMiddleware().server(async ({ next }) => {
  const auth = getAuth();
  const db = getDb();
  return next({
    context: {
      auth,
      db,
    },
  });
});

export const rateLimitMiddleware = createMiddleware().server(
  async ({ next }) => {
    const rateLimitResponse = await rateLimit();
    if (rateLimitResponse instanceof Response) {
      throw "error2";
    }
    return next();
  }
);

export const authMiddleware = createMiddleware()
  .middleware([contextMiddleware, rateLimitMiddleware])
  .server(async ({ request, next, context }) => {
    const session = await context.auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user) {
      throw "error";
    }
    return next({
      context: {
        session,
      },
    });
  });
