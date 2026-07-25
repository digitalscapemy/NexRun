import "server-only";

import { parseServerEnvironment } from "@/lib/validation/env";

export const serverEnv = Object.freeze(parseServerEnvironment(process.env));
