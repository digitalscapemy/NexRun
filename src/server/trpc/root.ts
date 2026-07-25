import { createTRPCRouter } from "./trpc";
import { eventRouter } from "./routers/event";
import { registrationRouter } from "./routers/registration";
import { operationalRouter } from "./routers/operational";
import { settingsRouter } from "./routers/settings";
import { activationRouter } from "./routers/activation";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  event: eventRouter,
  registration: registrationRouter,
  operational: operationalRouter,
  settings: settingsRouter,
  activation: activationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
