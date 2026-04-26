import type { EnvironmentId, ProjectId, ThreadId } from "@nitrocode/contracts";

import type { NitroMapDataSource, NitroProjectMap, NitroMapRouteParams } from "./types";

function scopedId(scope: string, suffix: string): string {
  return `${scope}:${suffix}`;
}

function scopedThreadId(scope: string, suffix: string): ThreadId {
  return scopedId(scope, suffix) as ThreadId;
}

export function buildMockNitroProjectMap(params: NitroMapRouteParams): NitroProjectMap {
  const scope = `${params.environmentId}:${params.projectId}`;
  const projectManagerId = scopedId(scope, "agent-project-manager");
  const platformManagerId = scopedId(scope, "agent-platform-manager");
  const uiImplementorId = scopedId(scope, "agent-ui-implementor");
  const runtimeImplementorId = scopedId(scope, "agent-runtime-implementor");
  const mapManagerId = scopedId(scope, "agent-map-manager");
  const canvasResourceId = scopedId(scope, "resource-canvas");
  const routeResourceId = scopedId(scope, "resource-routes");
  const ownershipResourceId = scopedId(scope, "resource-ownership");
  const traceResourceId = scopedId(scope, "resource-traces");
  const canvasResponsibilityId = scopedId(scope, "responsibility-canvas");
  const routeResponsibilityId = scopedId(scope, "responsibility-routes");
  const ownershipResponsibilityId = scopedId(scope, "responsibility-ownership");
  const traceResponsibilityId = scopedId(scope, "responsibility-traces");
  const activeEpisodeId = scopedId(scope, "episode-active");
  const activeRoundOneId = scopedId(scope, "round-active-1");
  const activeRoundTwoId = scopedId(scope, "round-active-2");
  const uiTraceId = scopedId(scope, "trace-ui-round-1");
  const runtimeTraceId = scopedId(scope, "trace-runtime-round-2");
  const uiInvocationId = scopedId(scope, "invocation-ui-round-1");
  const platformInvocationId = scopedId(scope, "invocation-platform-round-1");
  const runtimeInvocationId = scopedId(scope, "invocation-runtime-round-2");
  const mapInvocationId = scopedId(scope, "invocation-map-round-2");

  return {
    project: {
      environmentId: params.environmentId,
      projectId: params.projectId,
      name: `Project ${params.projectId}`,
    },
    agents: [
      {
        id: projectManagerId,
        label: "Project manager",
        kind: "management",
        purpose: "Supervises management agents that coordinate project ownership work.",
        status: "working",
        position: { x: 50, y: 18 },
      },
      {
        id: platformManagerId,
        label: "Platform manager",
        kind: "management",
        purpose: "Supervises implementation and management agents for UI/runtime work.",
        status: "working",
        position: { x: 29, y: 42 },
      },
      {
        id: mapManagerId,
        label: "Map manager",
        kind: "management",
        purpose: "Keeps ownership map responsibilities coherent for map-specific work.",
        status: "waiting",
        position: { x: 70, y: 42 },
      },
      {
        id: uiImplementorId,
        label: "UI implementor",
        kind: "implementation",
        purpose: "Watches project map routes, canvas layout, and inspector states.",
        status: "working",
        position: { x: 22, y: 72 },
      },
      {
        id: runtimeImplementorId,
        label: "Runtime implementor",
        kind: "implementation",
        purpose: "Watches ownership trace insertion and abort-facing runtime seams.",
        status: "idle",
        position: { x: 79, y: 72 },
      },
    ],
    supervisionEdges: [
      {
        id: scopedId(scope, "supervision-main-platform"),
        parentAgentId: projectManagerId,
        childAgentId: platformManagerId,
      },
      {
        id: scopedId(scope, "supervision-main-map"),
        parentAgentId: projectManagerId,
        childAgentId: mapManagerId,
      },
      {
        id: scopedId(scope, "supervision-platform-ui"),
        parentAgentId: platformManagerId,
        childAgentId: uiImplementorId,
      },
      {
        id: scopedId(scope, "supervision-map-runtime"),
        parentAgentId: mapManagerId,
        childAgentId: runtimeImplementorId,
      },
    ],
    resources: [
      {
        id: routeResourceId,
        label: "Project routes",
        kind: "directory",
        path: "apps/web/src/routes",
        position: { x: 9, y: 20 },
      },
      {
        id: canvasResourceId,
        label: "NitroMap UI",
        kind: "directory",
        path: "apps/web/src/nitromap",
        position: { x: 7, y: 57 },
      },
      {
        id: ownershipResourceId,
        label: "Ownership map",
        kind: "concept",
        path: "project ownership map",
        position: { x: 89, y: 25 },
      },
      {
        id: traceResourceId,
        label: "Trace insertion",
        kind: "concept",
        path: "conversation trace context",
        position: { x: 91, y: 60 },
      },
    ],
    responsibilities: [
      {
        id: routeResponsibilityId,
        agentId: uiImplementorId,
        resourceIds: [routeResourceId],
        label: "Project map routes",
        status: "watched",
        query: {
          label: "Route files for project map surfaces",
          definition: {
            kind: "path-glob",
            patterns: ["apps/web/src/routes/_nitromap.projects.*"],
          },
          rationale:
            "Route ownership controls how project map views stay separate from chat routes.",
        },
      },
      {
        id: canvasResponsibilityId,
        agentId: uiImplementorId,
        resourceIds: [canvasResourceId],
        label: "Canvas and inspectors",
        status: "owned",
        query: {
          label: "NitroMap canvas and inspector UI",
          definition: {
            kind: "path-glob",
            patterns: ["apps/web/src/nitromap/components/**"],
          },
          rationale: "The implementor owns visible map layout and selected-object inspection.",
        },
      },
      {
        id: ownershipResponsibilityId,
        agentId: mapManagerId,
        resourceIds: [ownershipResourceId],
        label: "Shared project ownership map",
        status: "owned",
        query: {
          label: "Project-scoped ownership semantics",
          definition: {
            kind: "path-set",
            paths: ["xdocs/spec-docs/ownership-map-vision.md"],
          },
          rationale:
            "The management agent keeps project map meaning coherent across conversations.",
        },
      },
      {
        id: traceResponsibilityId,
        agentId: runtimeImplementorId,
        resourceIds: [traceResourceId],
        label: "Slack-thread style trace context",
        status: "watched",
        query: {
          label: "Trace insertion and abort context",
          definition: {
            kind: "concept",
            key: "conversation-trace-context",
          },
          rationale:
            "Runtime behavior decides what trace context reaches the user-facing main agent.",
        },
      },
    ],
    ownershipEdges: [
      {
        id: scopedId(scope, "ownership-routes"),
        responsibilityId: routeResponsibilityId,
        agentId: uiImplementorId,
        resourceId: routeResourceId,
      },
      {
        id: scopedId(scope, "ownership-canvas"),
        responsibilityId: canvasResponsibilityId,
        agentId: uiImplementorId,
        resourceId: canvasResourceId,
      },
      {
        id: scopedId(scope, "ownership-map"),
        responsibilityId: ownershipResponsibilityId,
        agentId: mapManagerId,
        resourceId: ownershipResourceId,
      },
      {
        id: scopedId(scope, "ownership-traces"),
        responsibilityId: traceResponsibilityId,
        agentId: runtimeImplementorId,
        resourceId: traceResourceId,
      },
    ],
    interventions: [
      {
        id: scopedId(scope, "intervention-trace-owner"),
        status: "open",
        severity: "warning",
        title: "Trace owner should confirm injection details",
        summary:
          "The runtime implementor should confirm which trace result becomes visible in the main conversation.",
        source: {
          kind: "ownership-agent",
          agentId: runtimeImplementorId,
        },
        episodeId: activeEpisodeId,
        roundId: activeRoundTwoId,
        relatedResourceIds: [traceResourceId],
        relatedResponsibilityIds: [traceResponsibilityId],
        createdAt: "2026-04-25T09:45:00.000Z",
        resolvedAt: null,
      },
    ],
    workEpisodes: [
      {
        id: activeEpisodeId,
        environmentId: params.environmentId,
        projectId: params.projectId,
        conversationThreadId: scopedThreadId(scope, "thread-active"),
        startedFromMessageId: scopedId(scope, "message-active-start"),
        mainAgent: {
          label: "Conversation main agent",
          status: "working",
        },
        title: "User asked for Milestones 2-4",
        status: "running",
        backingThreadId: null,
        transcriptRoute: null,
        latestUserMessage:
          "Implement the basic UI, mock data, routes, and tests before the full Cartographer.",
        blockingItems: [],
        rounds: [
          {
            id: activeRoundOneId,
            episodeId: activeEpisodeId,
            index: 1,
            title: "Map shell implementation",
            status: "completed",
            startedByMessageId: scopedId(scope, "message-active-start"),
            startedByUserMessage:
              "Implement the basic UI, mock data, routes, and tests before the full Cartographer.",
            resultMessageId: scopedId(scope, "message-round-1-result"),
            startedAt: "2026-04-25T09:30:00.000Z",
            completedAt: "2026-04-25T09:38:00.000Z",
            traces: [
              {
                id: uiTraceId,
                roundId: activeRoundOneId,
                status: "injected",
                title: "UI implementation trace",
                summary:
                  "UI owner reviewed route and canvas changes; platform manager checked project-shell coherence.",
                rootInvocationId: uiInvocationId,
                invocationIds: [uiInvocationId, platformInvocationId],
                insertedAt: "2026-04-25T09:38:00.000Z",
              },
            ],
            invocations: [
              {
                id: uiInvocationId,
                roundId: activeRoundOneId,
                traceId: uiTraceId,
                agentId: uiImplementorId,
                parentInvocationId: null,
                trigger: "file-match",
                status: "responded",
                summary: "Reviewed NitroMap route, canvas, and inspector files.",
                startedAt: "2026-04-25T09:34:00.000Z",
                completedAt: "2026-04-25T09:36:00.000Z",
                position: { x: 18, y: 50 },
              },
              {
                id: platformInvocationId,
                roundId: activeRoundOneId,
                traceId: uiTraceId,
                agentId: platformManagerId,
                parentInvocationId: uiInvocationId,
                trigger: "supervision-response",
                status: "responded",
                summary: "Confirmed the work stays project-scoped and avoids thread identity.",
                startedAt: "2026-04-25T09:36:00.000Z",
                completedAt: "2026-04-25T09:38:00.000Z",
                position: { x: 64, y: 42 },
              },
            ],
          },
          {
            id: activeRoundTwoId,
            episodeId: activeEpisodeId,
            index: 2,
            title: "Trace and abort semantics",
            status: "running",
            startedByMessageId: scopedId(scope, "message-round-2-start"),
            startedByUserMessage:
              "Clarify that the user should not need to coordinate traces manually, while abort remains available.",
            resultMessageId: null,
            startedAt: "2026-04-25T09:41:00.000Z",
            completedAt: null,
            traces: [
              {
                id: runtimeTraceId,
                roundId: activeRoundTwoId,
                status: "pending",
                title: "Runtime trace insertion",
                summary:
                  "Runtime owner is checking how pending trace context and abort state should return to the main thread.",
                rootInvocationId: runtimeInvocationId,
                invocationIds: [runtimeInvocationId, mapInvocationId],
                insertedAt: null,
              },
            ],
            invocations: [
              {
                id: runtimeInvocationId,
                roundId: activeRoundTwoId,
                traceId: runtimeTraceId,
                agentId: runtimeImplementorId,
                parentInvocationId: null,
                trigger: "file-match",
                status: "running",
                summary: "Inspecting trace insertion and abort lifecycle behavior.",
                startedAt: "2026-04-25T09:42:00.000Z",
                completedAt: null,
                position: { x: 18, y: 58 },
              },
              {
                id: mapInvocationId,
                roundId: activeRoundTwoId,
                traceId: runtimeTraceId,
                agentId: mapManagerId,
                parentInvocationId: runtimeInvocationId,
                trigger: "supervision-response",
                status: "queued",
                summary: "Waiting to review whether the round changes ownership-map semantics.",
                startedAt: null,
                completedAt: null,
                position: { x: 64, y: 50 },
              },
            ],
          },
        ],
        createdAt: "2026-04-25T09:30:00.000Z",
        updatedAt: "2026-04-25T09:40:00.000Z",
      },
      {
        id: scopedId(scope, "episode-docs"),
        environmentId: params.environmentId,
        projectId: params.projectId,
        conversationThreadId: scopedThreadId(scope, "thread-docs"),
        startedFromMessageId: scopedId(scope, "message-docs-start"),
        mainAgent: {
          label: "Conversation main agent",
          status: "completed",
        },
        title: "Ownership docs reconciled",
        status: "completed",
        backingThreadId: null,
        transcriptRoute: null,
        latestUserMessage:
          "Clarify Cartographer, supervision edges, traces, and shared project map.",
        blockingItems: [],
        rounds: [],
        createdAt: "2026-04-25T07:40:00.000Z",
        updatedAt: "2026-04-25T08:10:00.000Z",
      },
      {
        id: scopedId(scope, "episode-blocked"),
        environmentId: params.environmentId,
        projectId: params.projectId,
        conversationThreadId: scopedThreadId(scope, "thread-blocked"),
        startedFromMessageId: scopedId(scope, "message-blocked-start"),
        mainAgent: {
          label: "Conversation main agent",
          status: "waiting",
        },
        title: "Approval waiting on user",
        status: "blocked",
        backingThreadId: null,
        transcriptRoute: null,
        latestUserMessage: "Approve the ownership trace insertion before continuing.",
        blockingItems: [
          {
            id: scopedId(scope, "block-approval"),
            kind: "approval",
            severity: "blocking",
            label: "Ownership trace insertion approval",
            sourceEventId: null,
            primaryAction: {
              kind: "decide-approval",
              label: "Review approval",
              disabled: true,
            },
            secondaryActions: [
              {
                kind: "open-transcript",
                label: "Open transcript",
                disabled: true,
              },
            ],
          },
        ],
        rounds: [],
        createdAt: "2026-04-25T08:20:00.000Z",
        updatedAt: "2026-04-25T08:50:00.000Z",
      },
      {
        id: scopedId(scope, "episode-failed"),
        environmentId: params.environmentId,
        projectId: params.projectId,
        conversationThreadId: scopedThreadId(scope, "thread-failed"),
        startedFromMessageId: scopedId(scope, "message-failed-start"),
        mainAgent: {
          label: "Conversation main agent",
          status: "failed",
        },
        title: "Provider turn failed",
        status: "failed",
        backingThreadId: null,
        transcriptRoute: null,
        latestUserMessage: "Continue after the provider turn failure is inspected.",
        blockingItems: [
          {
            id: scopedId(scope, "block-failed-turn"),
            kind: "failed-turn",
            severity: "blocking",
            label: "Provider turn failed before trace insertion completed",
            sourceEventId: scopedId(scope, "event-provider-failure"),
            primaryAction: {
              kind: "retry-turn",
              label: "Retry turn",
              disabled: true,
            },
            secondaryActions: [
              {
                kind: "open-transcript",
                label: "Open transcript",
                disabled: true,
              },
              {
                kind: "open-failure-detail",
                label: "Open failure detail",
                disabled: true,
              },
            ],
          },
        ],
        rounds: [],
        createdAt: "2026-04-25T08:55:00.000Z",
        updatedAt: "2026-04-25T09:00:00.000Z",
      },
    ],
    maintenance: {
      cartographerLabel: "Cartographer",
      cartographerStatus: "ready",
      lastCheckedAt: "2026-04-25T09:50:00.000Z",
      actions: [
        {
          id: scopedId(scope, "action-watch-traces"),
          actionKind: "update-responsibility",
          status: "proposed",
          title: "Confirm trace responsibility owner",
          reason:
            "Trace insertion is watched by runtime, but implementation ownership is not final.",
          targetId: traceResponsibilityId,
          targetKind: "responsibility",
          proposedResponsibilityStatus: "owned",
        },
      ],
    },
  };
}

const mockProjectIdsWithoutNitroMap = new Set<string>(["project-without-nitro-map"]);

function buildMockNitroProjectMapForDataSource(params: NitroMapRouteParams): NitroProjectMap {
  const map = buildMockNitroProjectMap(params);
  if (!mockProjectIdsWithoutNitroMap.has(params.projectId)) return map;
  return {
    ...map,
    maintenance: {
      ...map.maintenance,
      cartographerStatus: "not-run",
      lastCheckedAt: null,
    },
  };
}

export const mockNitroMapDataSource: NitroMapDataSource = {
  getProjectMap: async (params) => buildMockNitroProjectMapForDataSource(params),
  subscribeProjectMap: (params, listener) => {
    listener({
      kind: "snapshot",
      map: buildMockNitroProjectMapForDataSource(params),
      sequence: 1,
      projectVersion: 1,
    });
    return () => undefined;
  },
};

export function buildMockNitroRouteParams(input: {
  environmentId: string;
  projectId: string;
}): NitroMapRouteParams {
  return {
    environmentId: input.environmentId as EnvironmentId,
    projectId: input.projectId as ProjectId,
  };
}
