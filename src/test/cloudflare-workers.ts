const templateCache = new Map<string, string>();

export const env = {
  RESEND_API_KEY: "test",
  TURNSTILE_SECRET: "test",
  BETTER_AUTH_SECRET: "test",
  VITE_SERVER_URL: "http://localhost:3000",
  TEMPLATE_CACHE: {
    get: async (key: string) => templateCache.get(key) ?? null,
    put: async (key: string, value: string) => {
      templateCache.set(key, value);
    },
  },
  MY_RATE_LIMITER: {
    limit: async () => ({ success: true }),
  },
};
