import { rmSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const paths = [
  "node_modules",
  "apps/server/node_modules",
  "apps/web/node_modules",
  "apps/desktop/node_modules",
  "apps/marketing/node_modules",
  "packages/client-runtime/node_modules",
  "packages/contracts/node_modules",
  "packages/effect-acp/node_modules",
  "packages/effect-codex-app-server/node_modules",
  "packages/shared/node_modules",
  "scripts/node_modules",
  "apps/server/dist",
  "apps/web/dist",
  "apps/desktop/dist",
  "apps/desktop/dist-electron",
  "apps/marketing/dist",
  "packages/client-runtime/dist",
  "packages/contracts/dist",
  "packages/effect-acp/dist",
  "packages/effect-codex-app-server/dist",
  "packages/shared/dist",
  ".turbo",
  "apps/server/.turbo",
  "apps/web/.turbo",
  "apps/desktop/.turbo",
  "apps/marketing/.turbo",
  "packages/client-runtime/.turbo",
  "packages/contracts/.turbo",
  "packages/effect-acp/.turbo",
  "packages/effect-codex-app-server/.turbo",
  "packages/shared/.turbo",
  "scripts/.turbo",
] as const;

for (const target of paths) {
  const targetPath = resolve(repoRoot, target);
  const targetRelativePath = relative(repoRoot, targetPath);
  if (targetRelativePath.startsWith("..") || isAbsolute(targetRelativePath)) {
    throw new Error(`Refusing to clean path outside repository root: ${targetPath}`);
  }
  if (dryRun) {
    console.log(targetPath);
    continue;
  }
  rmSync(targetPath, { recursive: true, force: true });
}
