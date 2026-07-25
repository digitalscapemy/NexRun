export const AUTH_RATE_LIMIT_POLICY = {
  window: 60,
  max: 20,
  customRules: {
    // Session reads are frequent during client navigation and do not process
    // credentials. Keep a bounded allowance separate from mutation endpoints.
    "/get-session": { window: 60, max: 300 },
    "/sign-in/email": { window: 60, max: 8 },
    "/sign-up/email": { window: 60 * 60, max: 8 },
  },
} as const;
