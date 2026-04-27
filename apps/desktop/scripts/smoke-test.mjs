import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(__dirname, "..");
const electronBinDir = resolve(desktopDir, "node_modules/.bin");
const electronBinCandidates =
  process.platform === "win32"
    ? [
        resolve(desktopDir, "node_modules/electron/dist/electron.exe"),
        resolve(electronBinDir, "electron.exe"),
        resolve(electronBinDir, "electron.bunx"),
        resolve(electronBinDir, "electron.cmd"),
        resolve(electronBinDir, "electron"),
      ]
    : [resolve(electronBinDir, "electron")];
const electronBin = electronBinCandidates.find((candidate) => existsSync(candidate));
const mainJs = resolve(desktopDir, "dist-electron/main.cjs");

if (!electronBin) {
  throw new Error(`Could not find Electron binary in ${electronBinDir}`);
}

console.log("\nLaunching Electron smoke test...");

const child = spawn(electronBin, [mainJs], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: "",
    ELECTRON_ENABLE_LOGGING: "1",
  },
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

const timeout = setTimeout(() => {
  child.kill();
}, 8_000);

child.on("exit", () => {
  clearTimeout(timeout);

  const fatalPatterns = [
    "Cannot find module",
    "MODULE_NOT_FOUND",
    "Refused to execute",
    "Uncaught Error",
    "Uncaught TypeError",
    "Uncaught ReferenceError",
  ];
  const failures = fatalPatterns.filter((pattern) => output.includes(pattern));

  if (failures.length > 0) {
    console.error("\nDesktop smoke test failed:");
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    console.error("\nFull output:\n" + output);
    process.exit(1);
  }

  console.log("Desktop smoke test passed.");
  process.exit(0);
});
