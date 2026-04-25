import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import type { NitroMapDataSource, NitroProjectMap, NitroMapRouteParams } from "./types";

function scopedId(scope: string, suffix: string): string {
  return `${scope}:${suffix}`;
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
        resourceId: routeResourceId,
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
        resourceId: canvasResourceId,
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
        resourceId: ownershipResourceId,
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
        resourceId: traceResourceId,
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
    workEpisodes: [
      {
        id: activeEpisodeId,
        environmentId: params.environmentId,
        projectId: params.projectId,
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
        createdAt: "2026-04-25T09:30:00.000Z",
        updatedAt: "2026-04-25T09:40:00.000Z",
      },
      {
        id: scopedId(scope, "episode-docs"),
        environmentId: params.environmentId,
        projectId: params.projectId,
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
        createdAt: "2026-04-25T07:40:00.000Z",
        updatedAt: "2026-04-25T08:10:00.000Z",
      },
      {
        id: scopedId(scope, "episode-blocked"),
        environmentId: params.environmentId,
        projectId: params.projectId,
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
        createdAt: "2026-04-25T08:20:00.000Z",
        updatedAt: "2026-04-25T08:50:00.000Z",
      },
      {
        id: scopedId(scope, "episode-failed"),
        environmentId: params.environmentId,
        projectId: params.projectId,
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
        createdAt: "2026-04-25T08:55:00.000Z",
        updatedAt: "2026-04-25T09:00:00.000Z",
      },
    ],
    traces: [
      {
        id: scopedId(scope, "trace-ui"),
        episodeId: activeEpisodeId,
        agentId: uiImplementorId,
        status: "injected",
        title: "UI implementor returned route/canvas context",
        summary: "The main agent receives this as thread context instead of asking the user.",
        insertedAt: "2026-04-25T09:45:00.000Z",
      },
      {
        id: scopedId(scope, "trace-runtime"),
        episodeId: activeEpisodeId,
        agentId: runtimeImplementorId,
        status: "pending",
        title: "Runtime implementor watching abort semantics",
        summary: "Pending trace is visible so the user can abort the current turn if needed.",
        insertedAt: null,
      },
    ],
    interventions: [
      {
        id: scopedId(scope, "intervention-active"),
        targetId: activeEpisodeId,
        targetKind: "work-episode",
        status: "open",
        title: "Abort action is represented but not wired in the mock surface",
        requestedBy: "User",
      },
      {
        id: scopedId(scope, "intervention-manager"),
        targetId: platformManagerId,
        targetKind: "agent",
        status: "accepted",
        title: "Management agent supervises multiple children",
        requestedBy: "Cartographer",
      },
    ],
    maintenance: {
      cartographerLabel: "Cartographer",
      lastCheckedAt: "2026-04-25T09:50:00.000Z",
      actions: [
        {
          id: scopedId(scope, "action-watch-traces"),
          status: "proposed",
          title: "Confirm trace responsibility owner",
          reason:
            "Trace insertion is watched by runtime, but implementation ownership is not final.",
          targetId: traceResponsibilityId,
          targetKind: "responsibility",
        },
        {
          id: scopedId(scope, "action-keep-map-manager"),
          status: "accepted",
          title: "Keep map manager under project manager",
          reason:
            "The management hierarchy stays explicit and separate from Cartographer maintenance.",
          targetId: scopedId(scope, "supervision-main-map"),
          targetKind: "supervision-edge",
        },
      ],
    },
  };
}

export const mockNitroMapDataSource: NitroMapDataSource = {
  getProjectMap: async (params) => buildMockNitroProjectMap(params),
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
