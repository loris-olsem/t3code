import type {
  NitroMapGetProjectSnapshotInput,
  NitroMapProjectSnapshot,
  NitroMapSubscribeProjectInput,
  NitroMapSubscriptionEvent,
} from "@nitrocode/contracts";
import {
  NitroMapProjectionError,
  NitroMapSnapshot,
  NitroMapSubscriptionEvent as NitroMapSubscriptionEventSchema,
} from "@nitrocode/contracts";
import { Context, Effect, Schema } from "effect";
import type { Stream } from "effect";

export interface NitroMapProjectionShape {
  readonly getProjectSnapshot: (
    input: NitroMapGetProjectSnapshotInput,
  ) => Effect.Effect<NitroMapProjectSnapshot, NitroMapProjectionError>;
  readonly subscribeProject: (
    input: NitroMapSubscribeProjectInput,
  ) => Stream.Stream<NitroMapSubscriptionEvent, NitroMapProjectionError>;
}

export class NitroMapProjection extends Context.Service<
  NitroMapProjection,
  NitroMapProjectionShape
>()("nitrocode/nitromap/Services/NitroMapProjection") {}

const SEEDED_PROJECT_VERSION = 1;
const SEEDED_SNAPSHOT_SEQUENCE = 1;
const SEEDED_TIME = "2026-04-26T00:00:00.000Z";

const decodeSnapshot = Schema.decodeUnknownEffect(NitroMapSnapshot);
const decodeSubscriptionEvent = Schema.decodeUnknownEffect(NitroMapSubscriptionEventSchema);

function projectionError(message: string, cause: unknown) {
  return new NitroMapProjectionError({ message, cause });
}

function scopedId(input: NitroMapGetProjectSnapshotInput, suffix: string): string {
  return `${input.environmentId}:${input.projectId}:${suffix}`;
}

interface SeededNitroMapSnapshotOptions {
  readonly cartographerStatus?: "not-run" | "ready" | "running" | "failed";
}

export function buildSeededNitroMapSnapshot(
  input: NitroMapGetProjectSnapshotInput,
  options?: SeededNitroMapSnapshotOptions,
): unknown {
  const cartographerStatus = options?.cartographerStatus ?? "not-run";
  const projectManagerId = scopedId(input, "agent-project-manager");
  const platformManagerId = scopedId(input, "agent-platform-manager");
  const uiAgentId = scopedId(input, "agent-ui-implementor");
  const runtimeAgentId = scopedId(input, "agent-runtime-implementor");
  const uiResourceId = scopedId(input, "resource-web-ui");
  const serverResourceId = scopedId(input, "resource-server-runtime");
  const uiResponsibilityId = scopedId(input, "responsibility-web-ui");
  const serverResponsibilityId = scopedId(input, "responsibility-server-runtime");
  const episodeId = scopedId(input, "episode-seeded");
  const roundId = scopedId(input, "round-seeded-1");
  const traceId = scopedId(input, "trace-seeded-ui");
  const managerInvocationId = scopedId(input, "invocation-manager-seeded");
  const uiInvocationId = scopedId(input, "invocation-ui-seeded");

  return {
    environmentId: input.environmentId,
    projectId: input.projectId,
    projectName: `Project ${input.projectId}`,
    version: SEEDED_PROJECT_VERSION,
    generatedAt: SEEDED_TIME,
    resources: [
      {
        resourceId: uiResourceId,
        label: "Web UI",
        kind: "logical-component",
        locator: "apps/web",
        position: { x: 28, y: 70 },
      },
      {
        resourceId: serverResourceId,
        label: "Server runtime",
        kind: "logical-component",
        locator: "apps/server",
        position: { x: 72, y: 70 },
      },
    ],
    agents: [
      {
        agentId: projectManagerId,
        label: "Project manager",
        kind: "management",
        purpose: "Coordinates project ownership work for the episode.",
        status: "idle",
        position: { x: 50, y: 18 },
      },
      {
        agentId: platformManagerId,
        label: "Platform manager",
        kind: "management",
        purpose: "Supervises implementation agents for UI and runtime work.",
        status: "idle",
        position: { x: 50, y: 42 },
      },
      {
        agentId: uiAgentId,
        label: "UI implementor",
        kind: "implementation",
        purpose: "Watches the project map routes and chat controls.",
        status: "idle",
        position: { x: 28, y: 78 },
      },
      {
        agentId: runtimeAgentId,
        label: "Runtime implementor",
        kind: "implementation",
        purpose: "Watches server projection and RPC integration.",
        status: "idle",
        position: { x: 72, y: 78 },
      },
    ],
    responsibilities: [
      {
        responsibilityId: uiResponsibilityId,
        agentId: uiAgentId,
        label: "Project map UI",
        status: "owned",
        query: {
          kind: "path-glob",
          patterns: ["apps/web/src/nitromap/**"],
        },
        rationale: "UI ownership follows the project map route and panel files.",
      },
      {
        responsibilityId: serverResponsibilityId,
        agentId: runtimeAgentId,
        label: "NitroMap runtime boundary",
        status: "watched",
        query: {
          kind: "path-glob",
          patterns: ["apps/server/src/nitromap/**", "packages/contracts/src/nitromap.ts"],
        },
        rationale: "Runtime ownership follows server projection and shared contracts.",
      },
    ],
    ownershipEdges: [
      {
        edgeId: scopedId(input, "ownership-ui"),
        responsibilityId: uiResponsibilityId,
        agentId: uiAgentId,
        resourceId: uiResourceId,
      },
      {
        edgeId: scopedId(input, "ownership-runtime"),
        responsibilityId: serverResponsibilityId,
        agentId: runtimeAgentId,
        resourceId: serverResourceId,
      },
    ],
    supervisionEdges: [
      {
        edgeId: scopedId(input, "supervision-project-platform"),
        supervisingAgentId: projectManagerId,
        supervisedAgentId: platformManagerId,
      },
      {
        edgeId: scopedId(input, "supervision-platform-ui"),
        supervisingAgentId: platformManagerId,
        supervisedAgentId: uiAgentId,
      },
      {
        edgeId: scopedId(input, "supervision-platform-runtime"),
        supervisingAgentId: platformManagerId,
        supervisedAgentId: runtimeAgentId,
      },
    ],
    interventions: [],
    workEpisodes: [
      {
        episodeId,
        environmentId: input.environmentId,
        projectId: input.projectId,
        conversationThreadId: scopedId(input, "conversation-thread"),
        startedFromMessageId: scopedId(input, "message-start"),
        backingThreadId: scopedId(input, "conversation-thread"),
        transcriptRoute: null,
        title: "Seeded NitroMap episode",
        status: "completed",
        mainAgent: {
          mainAgentId: scopedId(input, "main-agent"),
          label: "Conversation main agent",
          status: "completed",
        },
        latestUserMessage: "Seeded NitroMap work request",
        blockingItems: [],
        rounds: [
          {
            roundId,
            episodeId,
            index: 1,
            title: "Round 1",
            status: "completed",
            startedByMessageId: scopedId(input, "message-start"),
            startedByUserMessage: "Seeded NitroMap work request",
            resultMessageId: scopedId(input, "message-result"),
            startedAt: SEEDED_TIME,
            completedAt: SEEDED_TIME,
            traces: [
              {
                traceId,
                roundId,
                status: "injected",
                title: "UI ownership trace",
                summary: "UI implementor responded through the seeded projection.",
                rootInvocationId: managerInvocationId,
                invocationIds: [managerInvocationId, uiInvocationId],
                insertedAt: SEEDED_TIME,
              },
            ],
            invocations: [
              {
                invocationId: managerInvocationId,
                roundId,
                traceId,
                agentId: platformManagerId,
                parentInvocationId: null,
                trigger: "manual",
                status: "responded",
                summary: "Platform manager selected the UI implementor.",
                startedAt: SEEDED_TIME,
                completedAt: SEEDED_TIME,
                position: { x: 50, y: 42 },
              },
              {
                invocationId: uiInvocationId,
                roundId,
                traceId,
                agentId: uiAgentId,
                parentInvocationId: managerInvocationId,
                trigger: "supervision-response",
                status: "responded",
                summary: "UI implementor returned the seeded trace result.",
                startedAt: SEEDED_TIME,
                completedAt: SEEDED_TIME,
                position: { x: 28, y: 78 },
              },
            ],
          },
        ],
        createdAt: SEEDED_TIME,
        updatedAt: SEEDED_TIME,
      },
    ],
    mapMaintenance: {
      cartographerStatus,
      lastCheckedAt: cartographerStatus === "ready" ? SEEDED_TIME : null,
      actions: [],
    },
  };
}

export function decodeNitroMapProjectionSnapshot(
  candidate: unknown,
): Effect.Effect<NitroMapProjectSnapshot, NitroMapProjectionError> {
  return decodeSnapshot(candidate).pipe(
    Effect.mapError((cause) => projectionError("Invalid NitroMap projection snapshot.", cause)),
  );
}

export function makeNitroMapSubscriptionEvent(
  input: NitroMapSubscribeProjectInput,
  snapshot: NitroMapProjectSnapshot,
): Effect.Effect<NitroMapSubscriptionEvent, NitroMapProjectionError> {
  const hasPartialResumeCursor =
    (input.lastSequence === undefined) !== (input.lastProjectVersion === undefined);
  if (hasPartialResumeCursor) {
    return Effect.fail(
      projectionError("Invalid NitroMap subscription cursor.", {
        reason: "Resume cursors require both lastSequence and lastProjectVersion.",
      }),
    );
  }
  const hasImpossibleResumeCursor =
    input.lastSequence !== undefined && input.lastSequence > SEEDED_SNAPSHOT_SEQUENCE;
  const hasProjectVersionMismatch =
    input.lastProjectVersion !== undefined && input.lastProjectVersion !== snapshot.version;
  const hasCurrentResumeCursor =
    input.lastSequence === SEEDED_SNAPSHOT_SEQUENCE &&
    input.lastProjectVersion === snapshot.version;
  const candidate =
    hasImpossibleResumeCursor || hasProjectVersionMismatch
      ? {
          type: "nitromap.discontinuity",
          environmentId: input.environmentId,
          projectId: input.projectId,
          sequence: SEEDED_SNAPSHOT_SEQUENCE,
          projectVersion: snapshot.version,
          emittedAt: SEEDED_TIME,
          reason: hasProjectVersionMismatch
            ? "Requested NitroMap project version does not match the available project stream."
            : "Requested NitroMap cursor is newer than the available project stream.",
          snapshot,
        }
      : hasCurrentResumeCursor
        ? {
            type: "nitromap.stale",
            environmentId: input.environmentId,
            projectId: input.projectId,
            sequence: input.lastSequence,
            projectVersion: snapshot.version,
            emittedAt: SEEDED_TIME,
            reason: "NitroMap projection has no events newer than the requested cursor.",
          }
        : {
            type: "nitromap.snapshot",
            environmentId: input.environmentId,
            projectId: input.projectId,
            sequence: SEEDED_SNAPSHOT_SEQUENCE,
            projectVersion: snapshot.version,
            emittedAt: SEEDED_TIME,
            snapshot,
          };

  return decodeSubscriptionEvent(candidate).pipe(
    Effect.mapError((cause) =>
      projectionError("Invalid NitroMap projection subscription event.", cause),
    ),
  );
}
