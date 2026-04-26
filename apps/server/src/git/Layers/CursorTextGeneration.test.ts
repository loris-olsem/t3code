import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as NodeProcess from "node:process";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { createModelSelection } from "@nitrocode/shared/model";
import { expect } from "vitest";

import { ServerSettingsError } from "@nitrocode/contracts";

import { ServerConfig } from "../../config.ts";
import { TextGeneration } from "../Services/TextGeneration.ts";
import { CursorTextGenerationLive } from "./CursorTextGeneration.ts";
import { ServerSettingsService } from "../../serverSettings.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockAgentPath = path.join(__dirname, "../../../scripts/acp-mock-agent.ts");

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

const CursorTextGenerationTestLayer = CursorTextGenerationLive.pipe(
  Layer.provideMerge(ServerSettingsService.layerTest()),
  Layer.provideMerge(
    ServerConfig.layerTest(process.cwd(), {
      prefix: "nitrocode-cursor-text-generation-test-",
    }),
  ),
  Layer.provideMerge(NodeServices.layer),
);

function makeAcpAgentWrapper(dir: string, env: Record<string, string>): string {
  const binDir = path.join(dir, "bin");
  const agentPath = path.join(binDir, NodeProcess.platform === "win32" ? "agent.cmd" : "agent");
  mkdirSync(binDir, { recursive: true });
  if (NodeProcess.platform === "win32") {
    const scriptPath = path.join(binDir, "agent-wrapper.mjs");
    writeFileSync(
      scriptPath,
      `
import { spawn } from "node:child_process";

const env = ${JSON.stringify(env)};
if (process.argv[2] !== "acp") {
  process.stderr.write("unexpected args: " + process.argv.slice(2).join(" ") + "\\n");
  process.exit(11);
}
const child = spawn("bun", [${JSON.stringify(mockAgentPath)}], {
  stdio: "inherit",
  env: { ...process.env, ...env },
});
child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exit(code);
  process.exit(signal ? 1 : 0);
});
`.trimStart(),
      "utf8",
    );
    writeFileSync(agentPath, `@echo off\r\nnode ${JSON.stringify(scriptPath)} %*\r\n`, "utf8");
    return agentPath;
  }
  writeFileSync(
    agentPath,
    [
      "#!/bin/sh",
      ...Object.entries(env).map(([key, value]) => `export ${key}=${shellSingleQuote(value)}`),
      'if [ "$1" != "acp" ]; then',
      '  printf "%s\\n" "unexpected args: $*" >&2',
      "  exit 11",
      "fi",
      `exec bun ${JSON.stringify(mockAgentPath)}`,
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(agentPath, 0o755);
  return agentPath;
}

function withFakeAcpAgent<A, E, R>(
  env: Record<string, string>,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | ServerSettingsError, R | ServerSettingsService> {
  return Effect.gen(function* () {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "nitrocode-cursor-text-acp-"));
    const agentPath = makeAcpAgentWrapper(tempDir, env);
    const serverSettings = yield* ServerSettingsService;
    const previousSettings = yield* serverSettings.getSettings;

    yield* serverSettings.updateSettings({
      providers: {
        cursor: {
          binaryPath: agentPath,
        },
      },
    });

    return yield* effect.pipe(
      Effect.ensuring(
        serverSettings
          .updateSettings({
            providers: {
              cursor: {
                binaryPath: previousSettings.providers.cursor.binaryPath,
              },
            },
          })
          .pipe(
            Effect.catch(() => Effect.void),
            Effect.ensuring(
              Effect.sync(() => {
                rmSync(tempDir, { recursive: true, force: true });
              }),
            ),
            Effect.asVoid,
          ),
      ),
    );
  });
}

function waitForFileContent(path: string): Effect.Effect<string> {
  return Effect.promise(async () => {
    const deadline = Date.now() + 5_000;
    for (;;) {
      try {
        return readFileSync(path, "utf8");
      } catch (error) {
        if (Date.now() >= deadline) {
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });
}

it.layer(CursorTextGenerationTestLayer)("CursorTextGenerationLive", (it) => {
  it.effect("uses ACP model config options instead of raw CLI model ids", () => {
    const requestLogDir = mkdtempSync(path.join(os.tmpdir(), "nitrocode-cursor-text-log-"));
    const requestLogPath = path.join(requestLogDir, "requests.ndjson");

    return withFakeAcpAgent(
      {
        NITROCODE_ACP_REQUEST_LOG_PATH: requestLogPath,
        NITROCODE_ACP_PROMPT_RESPONSE_TEXT: JSON.stringify({
          subject: "Add generated commit message",
          body: "- verify cursor acp model config path",
        }),
      },
      Effect.gen(function* () {
        const textGeneration = yield* TextGeneration;

        const generated = yield* textGeneration.generateCommitMessage({
          cwd: process.cwd(),
          branch: "feature/cursor-text-generation",
          stagedSummary: "M apps/server/src/git/Layers/CursorTextGeneration.ts",
          stagedPatch:
            "diff --git a/apps/server/src/git/Layers/CursorTextGeneration.ts b/apps/server/src/git/Layers/CursorTextGeneration.ts",
          modelSelection: {
            ...createModelSelection("cursor", "gpt-5.4", [
              { id: "reasoning", value: "xhigh" },
              { id: "fastMode", value: true },
              { id: "contextWindow", value: "1m" },
            ]),
          },
        });

        expect(generated.subject).toBe("Add generated commit message");
        expect(generated.body).toBe("- verify cursor acp model config path");

        const requests = readFileSync(requestLogPath, "utf8")
          .trim()
          .split("\n")
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as { method?: string; params?: Record<string, unknown> });

        expect(
          requests.find((request) => request.method === "initialize")?.params?.clientCapabilities,
        ).toMatchObject({
          _meta: {
            parameterizedModelPicker: true,
          },
        });
        expect(
          requests.some(
            (request) =>
              request.method === "session/set_config_option" &&
              request.params?.configId === "model" &&
              request.params?.value === "gpt-5.4",
          ),
        ).toBe(true);
        expect(
          requests.some(
            (request) =>
              request.method === "session/set_config_option" &&
              request.params?.configId === "reasoning" &&
              request.params?.value === "extra-high",
          ),
        ).toBe(true);
        expect(
          requests.some(
            (request) =>
              request.method === "session/set_config_option" &&
              request.params?.configId === "context" &&
              request.params?.value === "1m",
          ),
        ).toBe(true);
        expect(
          requests.some(
            (request) =>
              request.method === "session/set_config_option" &&
              request.params?.configId === "fast" &&
              request.params?.value === "true",
          ),
        ).toBe(true);
        expect(
          requests.find((request) => request.method === "session/prompt")?.params?.prompt,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("Staged patch:"),
            }),
          ]),
        );

        rmSync(requestLogDir, { recursive: true, force: true });
      }),
    );
  });

  it.effect("accepts json objects with extra assistant text around them", () =>
    withFakeAcpAgent(
      {
        NITROCODE_ACP_PROMPT_RESPONSE_TEXT:
          'Sure, here is the JSON:\n```json\n{\n  "subject": "Update README dummy comment with attribution and date",\n  "body": ""\n}\n```\nDone.',
      },
      Effect.gen(function* () {
        const textGeneration = yield* TextGeneration;

        const generated = yield* textGeneration.generateCommitMessage({
          cwd: process.cwd(),
          branch: "feature/cursor-noisy-json",
          stagedSummary: "M README.md",
          stagedPatch: "diff --git a/README.md b/README.md",
          modelSelection: {
            provider: "cursor",
            model: "composer-2",
          },
        });

        expect(generated.subject).toBe("Update README dummy comment with attribution and date");
        expect(generated.body).toBe("");
      }),
    ),
  );

  it.effect("generates thread titles through Cursor ACP text generation", () =>
    withFakeAcpAgent(
      {
        NITROCODE_ACP_PROMPT_RESPONSE_TEXT: JSON.stringify({
          title: '"Trim reconnect spinner status after resume."',
        }),
      },
      Effect.gen(function* () {
        const textGeneration = yield* TextGeneration;

        const generated = yield* textGeneration.generateThreadTitle({
          cwd: process.cwd(),
          message: "Fix the reconnect spinner after a resumed session.",
          modelSelection: {
            provider: "cursor",
            model: "composer-2",
          },
        });

        expect(generated.title).toBe("Trim reconnect spinner status after resume.");
      }),
    ),
  );

  it.effect("closes the ACP child process after text generation completes", () => {
    const exitLogDir = mkdtempSync(path.join(os.tmpdir(), "nitrocode-cursor-text-exit-log-"));
    const exitLogPath = path.join(exitLogDir, "exit.log");

    return withFakeAcpAgent(
      {
        NITROCODE_ACP_EXIT_LOG_PATH: exitLogPath,
        NITROCODE_ACP_PROMPT_RESPONSE_TEXT: JSON.stringify({
          subject: "Close runtime after generation",
          body: "",
        }),
      },
      Effect.gen(function* () {
        const textGeneration = yield* TextGeneration;

        const generated = yield* textGeneration.generateCommitMessage({
          cwd: process.cwd(),
          branch: "feature/cursor-runtime-close",
          stagedSummary: "M apps/server/src/git/Layers/CursorTextGeneration.ts",
          stagedPatch:
            "diff --git a/apps/server/src/git/Layers/CursorTextGeneration.ts b/apps/server/src/git/Layers/CursorTextGeneration.ts",
          modelSelection: {
            provider: "cursor",
            model: "composer-2",
          },
        });

        expect(generated.subject).toBe("Close runtime after generation");
        if (NodeProcess.platform === "win32") {
          rmSync(exitLogDir, { recursive: true, force: true });
          return;
        }

        const exitLog = yield* waitForFileContent(exitLogPath);
        expect(exitLog).toContain("exit:0");

        rmSync(exitLogDir, { recursive: true, force: true });
      }),
    );
  });
});
