import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";

export type NitroMapView = "map" | "work" | "map-maintenance";

export type NitroAgentKind = "management" | "implementation";

export type NitroAgentStatus = "idle" | "working" | "waiting" | "blocked";

export type NitroResourceKind = "file" | "directory" | "service" | "concept";

export type NitroResponsibilityStatus = "owned" | "watched" | "disputed";

export type NitroOwnershipTraceStatus =
  | "pending"
  | "injected"
  | "failure-injected"
  | "aborted"
  | "failed";

export type NitroInterventionStatus = "open" | "accepted" | "declined";

export type NitroReconciliationActionStatus = "proposed" | "accepted" | "declined";

export interface NitroMapRouteParams {
  environmentId: EnvironmentId;
  projectId: ProjectId;
}

export interface NitroMapDataSource {
  getProjectMap(params: NitroMapRouteParams): Promise<NitroProjectMap>;
}

export interface NitroProjectMap {
  project: {
    environmentId: EnvironmentId;
    projectId: ProjectId;
    name: string;
  };
  agents: NitroOwnershipAgent[];
  supervisionEdges: NitroSupervisionEdge[];
  resources: NitroResource[];
  responsibilities: NitroResponsibility[];
  ownershipEdges: NitroOwnershipEdge[];
  workEpisodes: NitroWorkEpisodeSummary[];
  maintenance: NitroMapMaintenanceSummary;
}

export interface NitroOwnershipAgent {
  id: string;
  label: string;
  kind: NitroAgentKind;
  purpose: string;
  status: NitroAgentStatus;
  position: {
    x: number;
    y: number;
  };
}

export interface NitroSupervisionEdge {
  id: string;
  parentAgentId: string;
  childAgentId: string;
}

export interface NitroResource {
  id: string;
  label: string;
  kind: NitroResourceKind;
  path: string;
  position: {
    x: number;
    y: number;
  };
}

export interface NitroResponsibility {
  id: string;
  agentId: string;
  resourceId: string;
  label: string;
  status: NitroResponsibilityStatus;
  query: NitroResponsibilityQuery;
}

export interface NitroResponsibilityQuery {
  label: string;
  definition: NitroResponsibilityQueryDefinition;
  rationale: string;
}

export type NitroResponsibilityQueryDefinition =
  | {
      kind: "path-glob";
      patterns: string[];
    }
  | {
      kind: "path-set";
      paths: string[];
    }
  | {
      kind: "concept";
      key: string;
    };

export interface NitroOwnershipEdge {
  id: string;
  responsibilityId: string;
  agentId: string;
  resourceId: string;
}

export interface NitroWorkEpisodeSummary {
  id: string;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  mainAgent: {
    label: string;
    status: "working" | "waiting" | "aborted" | "failed" | "completed";
  };
  title: string;
  status: "running" | "waiting" | "blocked" | "aborted" | "failed" | "completed";
  backingThreadId: ThreadId | null;
  transcriptRoute: string | null;
  latestUserMessage: string;
  blockingItems: NitroWorkEpisodeBlockingItem[];
  rounds: NitroWorkRoundSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface NitroWorkRoundSummary {
  id: string;
  episodeId: string;
  index: number;
  title: string;
  status: "running" | "waiting" | "blocked" | "aborted" | "failed" | "completed";
  startedByUserMessage: string;
  resultMessageId: string | null;
  startedAt: string;
  completedAt: string | null;
  traces: NitroRoundTrace[];
  invocations: NitroAgentInvocation[];
}

export interface NitroWorkEpisodeBlockingItem {
  id: string;
  kind: "approval" | "input" | "terminal" | "diff" | "failed-turn";
  severity: "info" | "warning" | "blocking";
  label: string;
  sourceEventId: string | null;
  primaryAction: NitroWorkEpisodeAction | null;
  secondaryActions: NitroWorkEpisodeAction[];
}

export interface NitroWorkEpisodeAction {
  kind:
    | "open-transcript"
    | "open-diff"
    | "open-terminal"
    | "open-failure-detail"
    | "answer-input"
    | "decide-approval"
    | "retry-turn";
  label: string;
  disabled: boolean;
}

export interface NitroRoundTrace {
  id: string;
  roundId: string;
  status: NitroOwnershipTraceStatus;
  title: string;
  summary: string;
  rootInvocationId: string;
  invocationIds: string[];
  insertedAt: string | null;
}

export interface NitroAgentInvocation {
  id: string;
  roundId: string;
  traceId: string;
  agentId: string;
  parentInvocationId: string | null;
  trigger: "file-match" | "supervision-response" | "manual";
  status: "queued" | "running" | "responded" | "no-response" | "failed" | "aborted";
  summary: string;
  startedAt: string | null;
  completedAt: string | null;
  position: {
    x: number;
    y: number;
  };
}

export interface NitroMapMaintenanceSummary {
  cartographerLabel: string;
  lastCheckedAt: string;
  actions: NitroMapReconciliationAction[];
}

export interface NitroMapReconciliationAction {
  id: string;
  status: NitroReconciliationActionStatus;
  title: string;
  reason: string;
  targetId: string;
  targetKind: "agent" | "resource" | "responsibility" | "supervision-edge";
}

export type NitroSelectionTarget =
  | { kind: "agent"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "responsibility"; id: string }
  | { kind: "supervision-edge"; id: string }
  | { kind: "ownership-edge"; id: string }
  | { kind: "work-episode"; id: string }
  | { kind: "work-round"; id: string }
  | { kind: "round-trace"; id: string }
  | { kind: "agent-invocation"; id: string }
  | { kind: "reconciliation-action"; id: string };
