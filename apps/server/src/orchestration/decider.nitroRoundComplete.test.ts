import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
} from "@t3tools/contracts";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const now = "2026-04-25T09:00:00.000Z";

async function seedThreadReadModel() {
  const empty = createEmptyReadModel(now);
  const withProject = await Effect.runPromise(
    projectEvent(empty, {
      sequence: 1,
      eventId: EventId.make("event-project"),
      aggregateKind: "project",
      aggregateId: ProjectId.make("project-system"),
      type: "project.created",
      occurredAt: now,
      commandId: CommandId.make("cmd-project"),
      causationEventId: null,
      correlationId: CommandId.make("cmd-project"),
      metadata: {},
      payload: {
        projectId: ProjectId.make("project-system"),
        title: "System Messages",
        workspaceRoot: "/tmp/system-messages",
        defaultModelSelection: null,
        scripts: [],
        createdAt: now,
        updatedAt: now,
      },
    }),
  );

  return Effect.runPromise(
    projectEvent(withProject, {
      sequence: 2,
      eventId: EventId.make("event-thread"),
      aggregateKind: "thread",
      aggregateId: ThreadId.make("thread-system"),
      type: "thread.created",
      occurredAt: now,
      commandId: CommandId.make("cmd-thread"),
      causationEventId: null,
      correlationId: CommandId.make("cmd-thread"),
      metadata: {},
      payload: {
        threadId: ThreadId.make("thread-system"),
        projectId: ProjectId.make("project-system"),
        title: "Thread",
        modelSelection: {
          provider: "codex",
          model: "gpt-5-codex",
        },
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        runtimeMode: "full-access",
        branch: null,
        worktreePath: null,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );
}

describe("decider Nitro round completion", () => {
  it("appends scoped Nitro completion system messages without starting a provider turn", async () => {
    const readModel = await seedThreadReadModel();
    const result = await Effect.runPromise(
      decideOrchestrationCommand({
        readModel,
        command: {
          type: "thread.nitro-round.complete",
          commandId: CommandId.make("cmd-nitro-round-complete"),
          threadId: ThreadId.make("thread-system"),
          messageId: MessageId.make("message-system"),
          episodeId: "episode-1",
          roundIndex: 1,
          status: "completed",
          workDetailRoute: "/projects/environment-1/project-1/work/episode-1",
          createdAt: now,
        },
      }),
    );

    expect(Array.isArray(result)).toBe(false);
    expect(result).toMatchObject({
      type: "thread.message-sent",
      payload: {
        threadId: "thread-system",
        messageId: "message-system",
        role: "system",
        text: "Nitro round 1 completed. [Open episode details](/projects/environment-1/project-1/work/episode-1).",
        turnId: null,
        streaming: false,
      },
    });
  });

  it("rejects external Nitro detail routes", async () => {
    const readModel = await seedThreadReadModel();
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          readModel,
          command: {
            type: "thread.nitro-round.complete",
            commandId: CommandId.make("cmd-nitro-round-complete"),
            threadId: ThreadId.make("thread-system"),
            messageId: MessageId.make("message-system"),
            episodeId: "episode-1",
            roundIndex: 1,
            status: "completed",
            workDetailRoute: "https://example.com)",
            createdAt: now,
          },
        }),
      ),
    ).rejects.toThrow("Nitro work detail route must be an internal project work route.");
  });

  it("rejects Nitro detail routes for another episode", async () => {
    const readModel = await seedThreadReadModel();
    await expect(
      Effect.runPromise(
        decideOrchestrationCommand({
          readModel,
          command: {
            type: "thread.nitro-round.complete",
            commandId: CommandId.make("cmd-nitro-round-complete"),
            threadId: ThreadId.make("thread-system"),
            messageId: MessageId.make("message-system"),
            episodeId: "episode-1",
            roundIndex: 1,
            status: "completed",
            workDetailRoute: "/projects/environment-1/project-1/work/episode-2",
            createdAt: now,
          },
        }),
      ),
    ).rejects.toThrow("Nitro work detail route must be an internal project work route.");
  });
});
