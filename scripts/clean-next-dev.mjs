import { existsSync, realpathSync, rmSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const workspace = realpathSync(process.cwd());
const devOutput = resolve(workspace, ".next", "dev");
const relativeTarget = relative(workspace, devOutput);

if (
  relativeTarget === "" ||
  relativeTarget.startsWith("..") ||
  isAbsolute(relativeTarget)
) {
  throw new Error(`Refusing to clean an unsafe path: ${devOutput}`);
}

if (!existsSync(devOutput)) {
  console.log("Next.js development cache is already clean.");
  process.exit(0);
}

try {
  rmSync(devOutput, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  });
  console.log("Cleared .next/dev. Production build output was preserved.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to clear .next/dev. Stop every NexRun dev server and retry. ${message}`,
  );
}
