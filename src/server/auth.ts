import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { db } from "./db";
import { serverEnv } from "./env";
import { AUTH_RATE_LIMIT_POLICY } from "./security/auth-rate-limit";

const secureCookies =
  serverEnv.NODE_ENV === "production" || serverEnv.BETTER_AUTH_URL.startsWith("https://");
const trustedOrigins = [...new Set([serverEnv.BETTER_AUTH_URL, serverEnv.NEXT_PUBLIC_APP_URL])];

export const auth = betterAuth({
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  trustedOrigins,
  rateLimit: {
    enabled: true,
    storage: "database",
    ...AUTH_RATE_LIMIT_POLICY,
  },
  advanced: {
    useSecureCookies: secureCookies,
    cookiePrefix: "nexrun",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
    },
  },
  plugins: [
    admin({
      defaultRole: "USER",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session age every 24 hours
  },
});

export type Session = typeof auth.$Infer.Session;
