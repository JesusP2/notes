import { env } from "cloudflare:workers";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, captcha } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb } from "../db";
import * as schema from "../db/schema/auth";

export function getAuth() {
  const db = getDb();
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    rateLimit: {
      window: 10,
      customStorage: {
        get: async (key) => {
          const value = await env.TEMPLATE_CACHE.get(key);
          if (!value) {
            throw new Error("Not found");
          }
          const parsed = JSON.parse(value);
          return {
            key: parsed.key,
            count: parsed.count,
            lastRequest: parsed.lastRequest,
          };
        },
        set: async (key, value) =>
          env.TEMPLATE_CACHE.put(key, JSON.stringify(value), {
            expirationTtl: 10,
          }),
      },
    },
    plugins: [
      anonymous(),
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: env.TURNSTILE_SECRET,
      }),
      admin(),
      passkey(),
      tanstackStartCookies(),
    ],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.VITE_SERVER_URL,
  });
  return auth;
}

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"]["session"];
export type User = Auth["$Infer"]["Session"]["user"];
