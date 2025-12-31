import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, captcha, magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Resend } from "resend";
import { getDb } from "../db";
// biome-ignore lint/performance/noNamespaceImport: shut up
import * as schema from "../db/schema/auth";
import { forgotPasswordTemplate } from "./emails/forgot-password";
import { magicLinkTemplate } from "./emails/magic-link";

const resend = new Resend(env.RESEND_API_KEY);
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
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await resend.emails.send({
            from: "no-reply@template.com",
            to: email,
            subject: "Magic link",
            react: magicLinkTemplate(url, env.VITE_SERVER_URL),
          });
        },
      }),
      admin(),
      passkey(),
      tanstackStartCookies(),
    ],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await resend.emails.send({
          from: "no-reply@template.com",
          to: user.email,
          subject: "Reset password",
          react: forgotPasswordTemplate(url, env.VITE_SERVER_URL),
        });
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.VITE_SERVER_URL,
  });
  return auth;
}

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"]["session"];
export type User = Auth["$Infer"]["Session"]["user"];
