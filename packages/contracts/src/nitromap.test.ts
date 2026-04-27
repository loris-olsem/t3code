import assert from "node:assert/strict";
import { it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  NitroMapReconciliationAction,
  NitroMapSnapshot,
  NitroMapSubscribeProjectInput,
  NitroMapSubscriptionEvent,
  NitroMapSupervisionEdge,
} from "./nitromap.ts";

const decodeSnapshot = Schema.decodeUnknownEffect(NitroMapSnapshot);
const decodeReconciliationAction = Schema.decodeUnknownEffect(NitroMapReconciliationAction);
const decodeSubscribeInput = Schema.decodeUnknownEffect(NitroMapSubscribeProjectInput);
const decodeSubscriptionEvent = Schema.decodeUnknownEffect(NitroMapSubscriptionEvent);
const decodeSupervisionEdge = Schema.decodeUnknownEffect(NitroMapSupervisionEdge);

const timestamp = "2026-04-26T10:00:00.000Z";

function makeValidSnapshotInput() {
  return {
    environmentId: "env-1",
    projectId: "project-1",
    projectName: "Project 1",
    version: 1,
    generatedAt: timestamp,
    resources: [
      {
        resourceId: "resource-web",
        label: "Web UI",
        kind: "folder",
        locator: "apps/web/src",
        position: { x: 10, y: 20 },
      },
    ],
    agents: [
      {
        agentId: "agent-manager",
        label: "Project manager",
        kind: "management",
        purpose: "Supervises project ownership work.",
        status: "working",
        position: { x: 50, y: 10 },
      },
      {
        agentId: "agent-web",
        label: "Web implementor",
        kind: "implementation",
        purpose: "Owns web UI files.",
        status: "idle",
        position: { x: 50, y: 40 },
      },
    ],
    responsibilities: [
      {
        responsibilityId: "responsibility-web",
        agentId: "agent-web",
        label: "Web files",
        status: "owned",
        query: {
          kind: "path-glob",
          patterns: ["apps/web/src/**"],
        },
        rationale: "The implementor owns the web source tree.",
      },
    ],
    ownershipEdges: [
      {
        edgeId: "ownership-web",
        responsibilityId: "responsibility-web",
        agentId: "agent-web",
        resourceId: "resource-web",
      },
    ],
    supervisionEdges: [
      {
        edgeId: "supervision-manager-web",
        supervisingAgentId: "agent-manager",
        supervisedAgentId: "agent-web",
      },
    ],
    interventions: [
      {
        interventionId: "intervention-1",
        status: "open",
        severity: "warning",
        title: "Test owner warning",
        summary: "The affected test files need attention before the episode completes.",
        source: {
          kind: "ownership-agent",
          agentId: "agent-web",
        },
        episodeId: "episode-1",
        roundId: "round-1",
        relatedResourceIds: ["resource-web"],
        relatedResponsibilityIds: ["responsibility-web"],
        createdAt: timestamp,
        resolvedAt: null,
      },
    ],
    workEpisodes: [
      {
        episodeId: "episode-1",
        environmentId: "env-1",
        projectId: "project-1",
        conversationThreadId: "thread-1",
        startedFromMessageId: "message-1",
        backingThreadId: "thread-1",
        transcriptRoute: "/env-1/thread-1",
        title: "Implement web change",
        status: "running",
        mainAgent: {
          mainAgentId: "main-agent-episode-1",
          label: "Conversation main agent",
          status: "waiting-for-ownership",
        },
        latestUserMessage: "Implement web change",
        blockingItems: [
          {
            blockingItemId: "blocker-1",
            kind: "approval",
            severity: "blocking",
            label: "Approve file edit",
            sourceEventId: "event-1",
            primaryAction: {
              kind: "decide-approval",
              label: "Review approval",
              disabled: false,
            },
            secondaryActions: [],
          },
        ],
        rounds: [
          {
            roundId: "round-1",
            episodeId: "episode-1",
            index: 0,
            title: "Initial ownership pass",
            status: "running",
            startedByMessageId: "message-1",
            startedByUserMessage: "Implement web change",
            resultMessageId: null,
            startedAt: timestamp,
            completedAt: null,
            traces: [
              {
                traceId: "trace-1",
                roundId: "round-1",
                status: "pending",
                title: "Web ownership trace",
                summary: "Web implementor inspected the affected files.",
                rootInvocationId: "invocation-1",
                invocationIds: ["invocation-1"],
                insertedAt: null,
              },
            ],
            invocations: [
              {
                invocationId: "invocation-1",
                roundId: "round-1",
                traceId: "trace-1",
                agentId: "agent-web",
                parentInvocationId: null,
                trigger: "file-match",
                status: "running",
                summary: "Checking web files.",
                startedAt: timestamp,
                completedAt: null,
                position: { x: 50, y: 40 },
              },
            ],
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    mapMaintenance: {
      cartographerStatus: "ready",
      lastCheckedAt: timestamp,
      actions: [
        {
          actionId: "action-1",
          status: "proposed",
          title: "Add ownership edge",
          reason: "A new resource needs an owner.",
          targetKind: "responsibility",
          targetId: "responsibility-web",
          changes: [
            {
              targetKind: "responsibility",
              targetId: "responsibility-web",
              before: {
                responsibilityId: "responsibility-web",
                agentId: "agent-web",
                label: "Web files",
                status: "watched",
                query: {
                  kind: "path-glob",
                  patterns: ["apps/web/src/**"],
                },
                rationale: "The implementor watches the web source tree.",
              },
              after: {
                responsibilityId: "responsibility-web",
                agentId: "agent-web",
                label: "Web files",
                status: "owned",
                query: {
                  kind: "path-glob",
                  patterns: ["apps/web/src/**"],
                },
                rationale: "The implementor owns the web source tree.",
              },
            },
          ],
          actionKind: "update-responsibility",
          createdAt: timestamp,
          appliedAt: null,
        },
      ],
    },
  };
}

it.effect("decodes a complete NitroMap project snapshot", () =>
  Effect.gen(function* () {
    const parsed = yield* decodeSnapshot(makeValidSnapshotInput());

    assert.strictEqual(parsed.projectId, "project-1");
    assert.strictEqual(parsed.resources[0]?.kind, "folder");
    assert.strictEqual(parsed.supervisionEdges[0]?.supervisingAgentId, "agent-manager");
    assert.strictEqual(parsed.interventions[0]?.episodeId, "episode-1");
    assert.strictEqual(parsed.mapMaintenance.actions[0]?.changes.length, 1);
    assert.strictEqual(parsed.workEpisodes[0]?.rounds[0]?.traces[0]?.status, "pending");
  }),
);

it.effect("decodes aborting main-agent status", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.workEpisodes[0]!.mainAgent.status = "aborting";

    const parsed = yield* decodeSnapshot(input);

    assert.strictEqual(parsed.workEpisodes[0]?.mainAgent.status, "aborting");
  }),
);

it.effect("decodes aborting round status", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.workEpisodes[0]!.rounds[0]!.status = "aborting";

    const parsed = yield* decodeSnapshot(input);

    assert.strictEqual(parsed.workEpisodes[0]?.rounds[0]?.status, "aborting");
  }),
);

it.effect("rejects responsibility queries without the required concrete selector", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.responsibilities[0] = {
      responsibilityId: "responsibility-web",
      agentId: "agent-web",
      label: "Web files",
      status: "owned",
      query: {
        kind: "path-glob",
        patterns: [],
      },
      rationale: "The implementor owns the web source tree.",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects supervision edges with empty agent ids", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeSupervisionEdge({
        edgeId: "edge-1",
        supervisingAgentId: "agent-manager",
        supervisedAgentId: " ",
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("decodes NitroMap subscription snapshot events", () =>
  Effect.gen(function* () {
    const parsed = yield* decodeSubscriptionEvent({
      type: "nitromap.snapshot",
      environmentId: "env-1",
      projectId: "project-1",
      sequence: 12,
      projectVersion: 1,
      emittedAt: timestamp,
      snapshot: makeValidSnapshotInput(),
    });

    assert.strictEqual(parsed.type, "nitromap.snapshot");
    assert.strictEqual(parsed.sequence, 12);
    assert.strictEqual(parsed.projectVersion, 1);
  }),
);

it.effect("decodes NitroMap subscription resume cursors", () =>
  Effect.gen(function* () {
    const parsed = yield* decodeSubscribeInput({
      environmentId: "env-1",
      projectId: "project-1",
      lastSequence: 11,
      lastProjectVersion: 2,
    });

    assert.strictEqual(parsed.lastSequence, 11);
    assert.strictEqual(parsed.lastProjectVersion, 2);
  }),
);

it.effect("rejects partial NitroMap subscription resume cursors", () =>
  Effect.gen(function* () {
    const missingProjectVersion = yield* Effect.exit(
      decodeSubscribeInput({
        environmentId: "env-1",
        projectId: "project-1",
        lastSequence: 11,
      }),
    );
    const missingSequence = yield* Effect.exit(
      decodeSubscribeInput({
        environmentId: "env-1",
        projectId: "project-1",
        lastProjectVersion: 2,
      }),
    );

    assert.strictEqual(missingProjectVersion._tag, "Failure");
    assert.strictEqual(missingSequence._tag, "Failure");
  }),
);

it.effect("decodes NitroMap discontinuity events with a fresh snapshot fallback", () =>
  Effect.gen(function* () {
    const parsed = yield* decodeSubscriptionEvent({
      type: "nitromap.discontinuity",
      environmentId: "env-1",
      projectId: "project-1",
      sequence: 20,
      projectVersion: 1,
      emittedAt: timestamp,
      reason: "Subscription cursor was too old.",
      snapshot: makeValidSnapshotInput(),
    });

    assert.strictEqual(parsed.type, "nitromap.discontinuity");
    assert.strictEqual(parsed.snapshot.projectId, "project-1");
  }),
);

it.effect("rejects subscription snapshots whose cursor metadata does not match the snapshot", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeSubscriptionEvent({
        type: "nitromap.snapshot",
        environmentId: "env-1",
        projectId: "project-1",
        sequence: 12,
        projectVersion: 2,
        emittedAt: timestamp,
        snapshot: makeValidSnapshotInput(),
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects discontinuity snapshots whose cursor metadata does not match the snapshot", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeSubscriptionEvent({
        type: "nitromap.discontinuity",
        environmentId: "env-1",
        projectId: "project-1",
        sequence: 12,
        projectVersion: 2,
        emittedAt: timestamp,
        reason: "Subscription cursor was incompatible.",
        snapshot: makeValidSnapshotInput(),
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect(
  "rejects reconciliation actions whose change payload does not match the target kind",
  () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(
        decodeReconciliationAction({
          actionId: "action-2",
          status: "proposed",
          title: "Bad resource payload",
          reason: "A resource update cannot carry an agent payload.",
          targetKind: "resource",
          targetId: "resource-web",
          actionKind: "update-resource",
          changes: [
            {
              targetKind: "resource",
              targetId: "resource-web",
              before: null,
              after: {
                agentId: "agent-web",
                label: "Web implementor",
                kind: "implementation",
                purpose: "Owns web UI files.",
                status: "idle",
              },
            },
          ],
          createdAt: timestamp,
          appliedAt: null,
        }),
      );

      assert.strictEqual(result._tag, "Failure");
    }),
);

it.effect("rejects reconciliation actions with no-op create/update/delete diffs", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeReconciliationAction({
        actionId: "action-3",
        status: "proposed",
        title: "Missing created resource",
        reason: "A create action must carry the created object.",
        targetKind: "resource",
        targetId: "resource-web",
        actionKind: "create-resource",
        changes: [
          {
            targetKind: "resource",
            targetId: "resource-web",
            before: null,
            after: null,
          },
        ],
        createdAt: timestamp,
        appliedAt: null,
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects reconciliation update actions whose payload does not change", () =>
  Effect.gen(function* () {
    const unchangedResource = {
      resourceId: "resource-web",
      label: "Web UI",
      kind: "folder",
      locator: "apps/web/src",
    };
    const result = yield* Effect.exit(
      decodeReconciliationAction({
        actionId: "action-unchanged",
        status: "proposed",
        title: "No-op resource update",
        reason: "Update actions need a real delta.",
        targetKind: "resource",
        targetId: "resource-web",
        actionKind: "update-resource",
        changes: [
          {
            targetKind: "resource",
            targetId: "resource-web",
            before: unchangedResource,
            after: unchangedResource,
          },
        ],
        createdAt: timestamp,
        appliedAt: null,
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects reconciliation changes whose target id differs from the action", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeReconciliationAction({
        actionId: "action-4",
        status: "proposed",
        title: "Mismatched target id",
        reason: "A reconciliation action should not carry changes for a different target.",
        targetKind: "resource",
        targetId: "resource-web",
        actionKind: "create-resource",
        changes: [
          {
            targetKind: "resource",
            targetId: "resource-other",
            before: null,
            after: {
              resourceId: "resource-other",
              label: "Other resource",
              kind: "file",
              locator: "apps/web/src/other.ts",
            },
          },
        ],
        createdAt: timestamp,
        appliedAt: null,
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects reconciliation payloads whose entity id differs from the action", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decodeReconciliationAction({
        actionId: "action-5",
        status: "proposed",
        title: "Mismatched payload id",
        reason: "The created resource must match the action target.",
        targetKind: "resource",
        targetId: "resource-web",
        actionKind: "create-resource",
        changes: [
          {
            targetKind: "resource",
            targetId: "resource-web",
            before: null,
            after: {
              resourceId: "resource-other",
              label: "Other resource",
              kind: "file",
              locator: "apps/web/src/other.ts",
            },
          },
        ],
        createdAt: timestamp,
        appliedAt: null,
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects snapshots with dangling ownership graph references", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.ownershipEdges[0] = {
      edgeId: "ownership-web",
      responsibilityId: "responsibility-web",
      agentId: "agent-missing",
      resourceId: "resource-web",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects ownership edges assigned to a different agent than their responsibility", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.ownershipEdges[0] = {
      ...input.ownershipEdges[0]!,
      agentId: "agent-manager",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects snapshots with duplicate top-level map ids", () =>
  Effect.gen(function* () {
    const duplicateAgentInput = makeValidSnapshotInput();
    duplicateAgentInput.agents.push({ ...duplicateAgentInput.agents[0]! });
    const duplicateAgentResult = yield* Effect.exit(decodeSnapshot(duplicateAgentInput));

    const duplicateResourceInput = makeValidSnapshotInput();
    duplicateResourceInput.resources.push({ ...duplicateResourceInput.resources[0]! });
    const duplicateResourceResult = yield* Effect.exit(decodeSnapshot(duplicateResourceInput));

    const duplicateResponsibilityInput = makeValidSnapshotInput();
    duplicateResponsibilityInput.responsibilities.push({
      ...duplicateResponsibilityInput.responsibilities[0]!,
    });
    const duplicateResponsibilityResult = yield* Effect.exit(
      decodeSnapshot(duplicateResponsibilityInput),
    );

    const duplicateOwnershipEdgeInput = makeValidSnapshotInput();
    duplicateOwnershipEdgeInput.ownershipEdges.push({
      ...duplicateOwnershipEdgeInput.ownershipEdges[0]!,
    });
    const duplicateOwnershipEdgeResult = yield* Effect.exit(
      decodeSnapshot(duplicateOwnershipEdgeInput),
    );

    const duplicateSupervisionEdgeInput = makeValidSnapshotInput();
    duplicateSupervisionEdgeInput.supervisionEdges.push({
      ...duplicateSupervisionEdgeInput.supervisionEdges[0]!,
    });
    const duplicateSupervisionEdgeResult = yield* Effect.exit(
      decodeSnapshot(duplicateSupervisionEdgeInput),
    );

    assert.strictEqual(duplicateAgentResult._tag, "Failure");
    assert.strictEqual(duplicateResourceResult._tag, "Failure");
    assert.strictEqual(duplicateResponsibilityResult._tag, "Failure");
    assert.strictEqual(duplicateOwnershipEdgeResult._tag, "Failure");
    assert.strictEqual(duplicateSupervisionEdgeResult._tag, "Failure");
  }),
);

it.effect("rejects snapshots missing UI-required layout positions", () =>
  Effect.gen(function* () {
    const missingResourcePositionInput = makeValidSnapshotInput();
    delete (missingResourcePositionInput.resources[0]! as Record<string, unknown>).position;
    const missingResourcePositionResult = yield* Effect.exit(
      decodeSnapshot(missingResourcePositionInput),
    );

    const missingAgentPositionInput = makeValidSnapshotInput();
    delete (missingAgentPositionInput.agents[0]! as Record<string, unknown>).position;
    const missingAgentPositionResult = yield* Effect.exit(
      decodeSnapshot(missingAgentPositionInput),
    );

    const missingInvocationPositionInput = makeValidSnapshotInput();
    delete (
      missingInvocationPositionInput.workEpisodes[0]!.rounds[0]!.invocations[0]! as Record<
        string,
        unknown
      >
    ).position;
    const missingInvocationPositionResult = yield* Effect.exit(
      decodeSnapshot(missingInvocationPositionInput),
    );

    assert.strictEqual(missingResourcePositionResult._tag, "Failure");
    assert.strictEqual(missingAgentPositionResult._tag, "Failure");
    assert.strictEqual(missingInvocationPositionResult._tag, "Failure");
  }),
);

it.effect("accepts responsibilities projected to multiple resource ownership edges", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.resources.push({
      resourceId: "resource-tests",
      label: "Tests",
      kind: "folder",
      locator: "apps/web/src/tests",
      position: { x: 80, y: 20 },
    });
    input.ownershipEdges.push({
      edgeId: "ownership-tests",
      responsibilityId: "responsibility-web",
      agentId: "agent-web",
      resourceId: "resource-tests",
    });

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Success");
  }),
);

it.effect("rejects duplicate ownership relations with different edge ids", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.ownershipEdges.push({
      ...input.ownershipEdges[0]!,
      edgeId: "ownership-web-duplicate-relation",
    });

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects responsibilities without ownership edges", () =>
  Effect.gen(function* () {
    const noEdgeInput = makeValidSnapshotInput();
    noEdgeInput.ownershipEdges = [];
    const noEdgeResult = yield* Effect.exit(decodeSnapshot(noEdgeInput));

    assert.strictEqual(noEdgeResult._tag, "Failure");
  }),
);

it.effect("rejects snapshots whose work episode or round scope is inconsistent", () =>
  Effect.gen(function* () {
    const mismatchedProjectInput = makeValidSnapshotInput();
    mismatchedProjectInput.workEpisodes[0]!.projectId = "project-other" as never;
    const mismatchedProjectResult = yield* Effect.exit(decodeSnapshot(mismatchedProjectInput));

    const mismatchedEnvironmentInput = makeValidSnapshotInput();
    mismatchedEnvironmentInput.workEpisodes[0]!.environmentId = "env-other" as never;
    const mismatchedEnvironmentResult = yield* Effect.exit(
      decodeSnapshot(mismatchedEnvironmentInput),
    );

    const mismatchedRoundInput = makeValidSnapshotInput();
    mismatchedRoundInput.workEpisodes[0]!.rounds[0]!.episodeId = "episode-other";
    const mismatchedRoundResult = yield* Effect.exit(decodeSnapshot(mismatchedRoundInput));

    assert.strictEqual(mismatchedProjectResult._tag, "Failure");
    assert.strictEqual(mismatchedEnvironmentResult._tag, "Failure");
    assert.strictEqual(mismatchedRoundResult._tag, "Failure");
  }),
);

it.effect("rejects snapshots with duplicate episode or round ids", () =>
  Effect.gen(function* () {
    const duplicateEpisodeInput = makeValidSnapshotInput();
    duplicateEpisodeInput.workEpisodes.push({
      ...duplicateEpisodeInput.workEpisodes[0]!,
    });
    const duplicateEpisodeResult = yield* Effect.exit(decodeSnapshot(duplicateEpisodeInput));

    const duplicateRoundInput = makeValidSnapshotInput();
    duplicateRoundInput.workEpisodes[0]!.rounds.push({
      ...duplicateRoundInput.workEpisodes[0]!.rounds[0]!,
    });
    const duplicateRoundResult = yield* Effect.exit(decodeSnapshot(duplicateRoundInput));

    assert.strictEqual(duplicateEpisodeResult._tag, "Failure");
    assert.strictEqual(duplicateRoundResult._tag, "Failure");
  }),
);

it.effect(
  "rejects snapshots with duplicate trace, invocation, intervention, action, or blocker ids",
  () =>
    Effect.gen(function* () {
      const duplicateTraceInput = makeValidSnapshotInput();
      duplicateTraceInput.workEpisodes[0]!.rounds[0]!.traces.push({
        ...duplicateTraceInput.workEpisodes[0]!.rounds[0]!.traces[0]!,
      });
      const duplicateTraceResult = yield* Effect.exit(decodeSnapshot(duplicateTraceInput));

      const duplicateInvocationInput = makeValidSnapshotInput();
      duplicateInvocationInput.workEpisodes[0]!.rounds[0]!.invocations.push({
        ...duplicateInvocationInput.workEpisodes[0]!.rounds[0]!.invocations[0]!,
      });
      const duplicateInvocationResult = yield* Effect.exit(
        decodeSnapshot(duplicateInvocationInput),
      );

      const duplicateInterventionInput = makeValidSnapshotInput();
      duplicateInterventionInput.interventions.push({
        ...duplicateInterventionInput.interventions[0]!,
      });
      const duplicateInterventionResult = yield* Effect.exit(
        decodeSnapshot(duplicateInterventionInput),
      );

      const duplicateActionInput = makeValidSnapshotInput();
      duplicateActionInput.mapMaintenance.actions.push({
        ...duplicateActionInput.mapMaintenance.actions[0]!,
      });
      const duplicateActionResult = yield* Effect.exit(decodeSnapshot(duplicateActionInput));

      const duplicateBlockerInput = makeValidSnapshotInput();
      duplicateBlockerInput.workEpisodes[0]!.blockingItems.push({
        ...duplicateBlockerInput.workEpisodes[0]!.blockingItems[0]!,
      });
      const duplicateBlockerResult = yield* Effect.exit(decodeSnapshot(duplicateBlockerInput));

      assert.strictEqual(duplicateTraceResult._tag, "Failure");
      assert.strictEqual(duplicateInvocationResult._tag, "Failure");
      assert.strictEqual(duplicateInterventionResult._tag, "Failure");
      assert.strictEqual(duplicateActionResult._tag, "Failure");
      assert.strictEqual(duplicateBlockerResult._tag, "Failure");
    }),
);

it.effect("rejects snapshots with dangling invocation trace references", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.workEpisodes[0]!.rounds[0]!.invocations[0] = {
      ...input.workEpisodes[0]!.rounds[0]!.invocations[0]!,
      traceId: "trace-missing",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects snapshots with dangling invocation graph references", () =>
  Effect.gen(function* () {
    const danglingAgentInput = makeValidSnapshotInput();
    danglingAgentInput.workEpisodes[0]!.rounds[0]!.invocations[0]!.agentId =
      "agent-missing" as never;
    const danglingAgentResult = yield* Effect.exit(decodeSnapshot(danglingAgentInput));

    const danglingParentInput = makeValidSnapshotInput();
    danglingParentInput.workEpisodes[0]!.rounds[0]!.invocations[0]!.parentInvocationId =
      "invocation-missing" as never;
    const danglingParentResult = yield* Effect.exit(decodeSnapshot(danglingParentInput));

    const danglingRootInput = makeValidSnapshotInput();
    danglingRootInput.workEpisodes[0]!.rounds[0]!.traces[0]!.rootInvocationId =
      "invocation-missing" as never;
    const danglingRootResult = yield* Effect.exit(decodeSnapshot(danglingRootInput));

    const danglingTraceInvocationInput = makeValidSnapshotInput();
    danglingTraceInvocationInput.workEpisodes[0]!.rounds[0]!.traces[0]!.invocationIds = [
      "invocation-missing",
    ] as never;
    const danglingTraceInvocationResult = yield* Effect.exit(
      decodeSnapshot(danglingTraceInvocationInput),
    );

    assert.strictEqual(danglingAgentResult._tag, "Failure");
    assert.strictEqual(danglingParentResult._tag, "Failure");
    assert.strictEqual(danglingRootResult._tag, "Failure");
    assert.strictEqual(danglingTraceInvocationResult._tag, "Failure");
  }),
);

it.effect("rejects snapshots with dangling supervision edge agent references", () =>
  Effect.gen(function* () {
    const missingSupervisorInput = makeValidSnapshotInput();
    missingSupervisorInput.supervisionEdges[0]!.supervisingAgentId = "agent-missing" as never;
    const missingSupervisorResult = yield* Effect.exit(decodeSnapshot(missingSupervisorInput));

    const missingSupervisedInput = makeValidSnapshotInput();
    missingSupervisedInput.supervisionEdges[0]!.supervisedAgentId = "agent-missing" as never;
    const missingSupervisedResult = yield* Effect.exit(decodeSnapshot(missingSupervisedInput));

    assert.strictEqual(missingSupervisorResult._tag, "Failure");
    assert.strictEqual(missingSupervisedResult._tag, "Failure");
  }),
);

it.effect("rejects supervision edges whose supervisor is not a management agent", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.agents.push({
      agentId: "agent-tests",
      label: "Tests implementor",
      kind: "implementation",
      purpose: "Owns tests.",
      status: "idle",
      position: { x: 90, y: 60 },
    });
    input.supervisionEdges[0] = {
      edgeId: "supervision-implementation",
      supervisingAgentId: "agent-web",
      supervisedAgentId: "agent-tests",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects snapshots with dangling intervention source references", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.interventions[0] = {
      ...input.interventions[0]!,
      source: {
        kind: "ownership-agent",
        agentId: "agent-missing",
      },
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects snapshots with inconsistent intervention episode and related references", () =>
  Effect.gen(function* () {
    const danglingEpisodeInput = makeValidSnapshotInput();
    danglingEpisodeInput.interventions[0] = {
      ...danglingEpisodeInput.interventions[0]!,
      episodeId: "episode-missing",
    };
    const danglingEpisodeResult = yield* Effect.exit(decodeSnapshot(danglingEpisodeInput));

    const danglingRoundInput = makeValidSnapshotInput();
    danglingRoundInput.interventions[0] = {
      ...danglingRoundInput.interventions[0]!,
      roundId: "round-missing",
    };
    const danglingRoundResult = yield* Effect.exit(decodeSnapshot(danglingRoundInput));

    const mismatchedSourceInput = makeValidSnapshotInput();
    mismatchedSourceInput.interventions[0]!.source = {
      kind: "work-episode",
      episodeId: "episode-other",
    } as never;
    mismatchedSourceInput.workEpisodes.push({
      ...mismatchedSourceInput.workEpisodes[0]!,
      episodeId: "episode-other",
      rounds: [],
    });
    const mismatchedSourceResult = yield* Effect.exit(decodeSnapshot(mismatchedSourceInput));

    const missingTopLevelEpisodeInput = makeValidSnapshotInput();
    missingTopLevelEpisodeInput.interventions[0]!.source = {
      kind: "work-episode",
      episodeId: "episode-1",
    } as never;
    missingTopLevelEpisodeInput.interventions[0]!.episodeId = null as never;
    const missingTopLevelEpisodeResult = yield* Effect.exit(
      decodeSnapshot(missingTopLevelEpisodeInput),
    );

    const danglingRelatedInput = makeValidSnapshotInput();
    danglingRelatedInput.interventions[0] = {
      ...danglingRelatedInput.interventions[0]!,
      relatedResourceIds: ["resource-missing"],
    };
    const danglingRelatedResult = yield* Effect.exit(decodeSnapshot(danglingRelatedInput));

    const danglingResponsibilityInput = makeValidSnapshotInput();
    danglingResponsibilityInput.interventions[0] = {
      ...danglingResponsibilityInput.interventions[0]!,
      relatedResponsibilityIds: ["responsibility-missing"],
    };
    const danglingResponsibilityResult = yield* Effect.exit(
      decodeSnapshot(danglingResponsibilityInput),
    );

    assert.strictEqual(danglingEpisodeResult._tag, "Failure");
    assert.strictEqual(danglingRoundResult._tag, "Failure");
    assert.strictEqual(mismatchedSourceResult._tag, "Failure");
    assert.strictEqual(missingTopLevelEpisodeResult._tag, "Failure");
    assert.strictEqual(danglingRelatedResult._tag, "Failure");
    assert.strictEqual(danglingResponsibilityResult._tag, "Failure");
  }),
);

it.effect("rejects reconciliation payloads with dangling graph references", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.mapMaintenance.actions[0]!.changes[0]!.after = {
      responsibilityId: "responsibility-web",
      agentId: "agent-missing",
      label: "Web files",
      status: "owned",
      query: {
        kind: "path-glob",
        patterns: ["apps/web/src/**"],
      },
      rationale: "The implementor owns the web source tree.",
    };

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects reconciliation lifecycle timestamp mismatches", () =>
  Effect.gen(function* () {
    const appliedWithoutAppliedAt = makeValidSnapshotInput();
    appliedWithoutAppliedAt.mapMaintenance.actions[0]!.status = "applied";
    appliedWithoutAppliedAt.mapMaintenance.actions[0]!.appliedAt = null;
    const appliedWithoutAppliedAtResult = yield* Effect.exit(
      decodeSnapshot(appliedWithoutAppliedAt),
    );

    const proposedWithAppliedAt = makeValidSnapshotInput();
    proposedWithAppliedAt.mapMaintenance.actions[0]!.status = "proposed";
    proposedWithAppliedAt.mapMaintenance.actions[0]!.appliedAt = timestamp as never;
    const proposedWithAppliedAtResult = yield* Effect.exit(decodeSnapshot(proposedWithAppliedAt));

    assert.strictEqual(appliedWithoutAppliedAtResult._tag, "Failure");
    assert.strictEqual(proposedWithAppliedAtResult._tag, "Failure");
  }),
);

it.effect(
  "rejects reconciliation actions whose target existence is wrong for the action kind",
  () =>
    Effect.gen(function* () {
      const createExistingInput = makeValidSnapshotInput();
      createExistingInput.mapMaintenance.actions[0] = {
        actionId: "action-create-existing",
        status: "proposed",
        title: "Create existing resource",
        reason: "Create actions must not target existing map ids.",
        targetKind: "resource",
        targetId: "resource-web",
        actionKind: "create-resource",
        changes: [
          {
            targetKind: "resource",
            targetId: "resource-web",
            before: null,
            after: {
              resourceId: "resource-web",
              label: "Web UI",
              kind: "folder",
              locator: "apps/web/src",
              position: { x: 10, y: 20 },
            },
          },
        ],
        createdAt: timestamp,
        appliedAt: null,
      } as never;
      const createExistingResult = yield* Effect.exit(decodeSnapshot(createExistingInput));

      const updateMissingInput = makeValidSnapshotInput();
      updateMissingInput.mapMaintenance.actions[0] = {
        ...updateMissingInput.mapMaintenance.actions[0]!,
        targetId: "responsibility-missing",
        changes: [
          {
            ...updateMissingInput.mapMaintenance.actions[0]!.changes[0]!,
            targetId: "responsibility-missing",
            before: {
              ...updateMissingInput.mapMaintenance.actions[0]!.changes[0]!.before!,
              responsibilityId: "responsibility-missing",
            },
            after: {
              ...updateMissingInput.mapMaintenance.actions[0]!.changes[0]!.after!,
              responsibilityId: "responsibility-missing",
            },
          },
        ],
      };
      const updateMissingResult = yield* Effect.exit(decodeSnapshot(updateMissingInput));

      assert.strictEqual(createExistingResult._tag, "Failure");
      assert.strictEqual(updateMissingResult._tag, "Failure");
    }),
);

it.effect("rejects edge reconciliation payloads with dangling graph references", () =>
  Effect.gen(function* () {
    const danglingOwnershipEdgePayloadInput = makeValidSnapshotInput();
    danglingOwnershipEdgePayloadInput.mapMaintenance.actions[0] = {
      actionId: "action-create-ownership",
      status: "proposed",
      title: "Create ownership edge",
      reason: "Ownership edge payloads must reference existing graph ids.",
      targetKind: "ownership-edge",
      targetId: "ownership-new",
      actionKind: "create-ownership-edge",
      changes: [
        {
          targetKind: "ownership-edge",
          targetId: "ownership-new",
          before: null,
          after: {
            edgeId: "ownership-new",
            responsibilityId: "responsibility-web",
            agentId: "agent-missing",
            resourceId: "resource-web",
          },
        },
      ],
      createdAt: timestamp,
      appliedAt: null,
    } as never;
    const danglingOwnershipEdgePayloadResult = yield* Effect.exit(
      decodeSnapshot(danglingOwnershipEdgePayloadInput),
    );

    const danglingSupervisionEdgePayloadInput = makeValidSnapshotInput();
    danglingSupervisionEdgePayloadInput.mapMaintenance.actions[0] = {
      actionId: "action-create-supervision",
      status: "proposed",
      title: "Create supervision edge",
      reason: "Supervision edge payloads must reference existing graph ids.",
      targetKind: "supervision-edge",
      targetId: "supervision-new",
      actionKind: "create-supervision-edge",
      changes: [
        {
          targetKind: "supervision-edge",
          targetId: "supervision-new",
          before: null,
          after: {
            edgeId: "supervision-new",
            supervisingAgentId: "agent-manager",
            supervisedAgentId: "agent-missing",
          },
        },
      ],
      createdAt: timestamp,
      appliedAt: null,
    } as never;
    const danglingSupervisionEdgePayloadResult = yield* Effect.exit(
      decodeSnapshot(danglingSupervisionEdgePayloadInput),
    );

    assert.strictEqual(danglingOwnershipEdgePayloadResult._tag, "Failure");
    assert.strictEqual(danglingSupervisionEdgePayloadResult._tag, "Failure");
  }),
);

it.effect("rejects ownership-edge reconciliation payloads assigned to the wrong agent", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.mapMaintenance.actions[0] = {
      actionId: "action-create-ownership",
      status: "proposed",
      title: "Create ownership edge",
      reason: "Ownership edge payloads must match the responsibility owner.",
      targetKind: "ownership-edge",
      targetId: "ownership-new",
      actionKind: "create-ownership-edge",
      changes: [
        {
          targetKind: "ownership-edge",
          targetId: "ownership-new",
          before: null,
          after: {
            edgeId: "ownership-new",
            responsibilityId: "responsibility-web",
            agentId: "agent-manager",
            resourceId: "resource-web",
          },
        },
      ],
      createdAt: timestamp,
      appliedAt: null,
    } as never;

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects ownership-edge reconciliation payloads that duplicate existing relations", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.mapMaintenance.actions[0] = {
      actionId: "action-create-ownership",
      status: "proposed",
      title: "Create ownership edge",
      reason: "Ownership edge payloads must not duplicate ownership relations.",
      targetKind: "ownership-edge",
      targetId: "ownership-new",
      actionKind: "create-ownership-edge",
      changes: [
        {
          targetKind: "ownership-edge",
          targetId: "ownership-new",
          before: null,
          after: {
            ...input.ownershipEdges[0]!,
            edgeId: "ownership-new",
          },
        },
      ],
      createdAt: timestamp,
      appliedAt: null,
    } as never;

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("rejects supervision-edge reconciliation payloads with non-management supervisors", () =>
  Effect.gen(function* () {
    const input = makeValidSnapshotInput();
    input.mapMaintenance.actions[0] = {
      actionId: "action-create-supervision",
      status: "proposed",
      title: "Create supervision edge",
      reason: "Supervision edge payloads must use management supervisors.",
      targetKind: "supervision-edge",
      targetId: "supervision-new",
      actionKind: "create-supervision-edge",
      changes: [
        {
          targetKind: "supervision-edge",
          targetId: "supervision-new",
          before: null,
          after: {
            edgeId: "supervision-new",
            supervisingAgentId: "agent-web",
            supervisedAgentId: "agent-manager",
          },
        },
      ],
      createdAt: timestamp,
      appliedAt: null,
    } as never;

    const result = yield* Effect.exit(decodeSnapshot(input));

    assert.strictEqual(result._tag, "Failure");
  }),
);
