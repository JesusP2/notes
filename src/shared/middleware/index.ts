import { env } from "cloudflare:workers";
import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "@/auth/server";
import { getDb } from "@/db";

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

export const rateLimitMiddleware = createMiddleware()
  .middleware([contextMiddleware])
  .server(async ({ next, request, context }) => {
    const session = await context.auth.api.getSession({
      headers: request.headers,
    });
    const ipAddress = request.headers.get("cf-connecting-ip") || "";
    const rateLimitResponse = await env.MY_RATE_LIMITER.limit({
      key: session?.user.id ?? ipAddress,
    });
    if (!rateLimitResponse.success) {
      throw new Error("get rate limited bozo");
    }
    return next({
      context: {
        session,
      },
    });
  });

export const authMiddleware = createMiddleware()
  .middleware([rateLimitMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session?.user) {
      throw "error";
    }
    return next({
      context: {
        session: context.session,
      },
    });
  });
