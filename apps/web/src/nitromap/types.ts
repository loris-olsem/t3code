import type { EnvironmentId, ProjectId, ThreadId } from "@nitrocode/contracts";

export type NitroMapView = "map" | "work" | "map-maintenance";

export type NitroAgentKind = "management" | "implementation";

export type NitroAgentStatus = "idle" | "working" | "waiting" | "blocked" | "failed";

export type NitroResourceKind =
  | "file"
  | "directory"
  | "service"
  | "concept"
  | "generated-asset"
  | "remote-resource"
  | "logical-component";

export type NitroResponsibilityStatus = "owned" | "watched" | "disputed";

export type NitroOwnershipTraceStatus =
  | "pending"
  | "injected"
  | "not-injected"
  | "failure-injected"
  | "aborted"
  | "failed";

export type NitroInterventionStatus = "open" | "accepted" | "declined";

export type NitroReconciliationActionStatus = "proposed" | "accepted" | "declined" | "applied";

export interface NitroMapRouteParams {
  environmentId: EnvironmentId;
  projectId: ProjectId;
}

export interface NitroMapDataSource {
  getProjectMap(params: NitroMapRouteParams): Promise<NitroProjectMap>;
  subscribeProjectMap(
    params: NitroMapRouteParams,
    listener: (event: NitroProjectMapSubscriptionEvent) => void,
  ): () => void;
}

export type NitroProjectMapSubscriptionEvent =
  | {
      kind: "snapshot";
      map: NitroProjectMap;
      sequence: number;
      projectVersion: number;
    }
  | {
      kind: "stale";
      reason: string;
      sequence: number;
      projectVersion: number;
    }
  | {
      kind: "error";
      message: string;
    };

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
  interventions: NitroIntervention[];
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
  resourceIds: string[];
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
    }
  | {
      kind: "event-query";
      eventKinds: string[];
      resourceLocator?: string;
    }
  | {
      kind: "derived";
      source: "mock" | "future-indexer";
      description: string;
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
  conversationThreadId: ThreadId;
  startedFromMessageId: string;
  mainAgent: {
    label: string;
    status: "idle" | "working" | "waiting" | "aborting" | "aborted" | "failed" | "completed";
  };
  title: string;
  status:
    | "idle"
    | "running"
    | "waiting"
    | "blocked"
    | "aborting"
    | "aborted"
    | "failed"
    | "completed";
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
  status: "running" | "waiting" | "blocked" | "aborting" | "aborted" | "failed" | "completed";
  startedByMessageId: string;
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
    | "retry-turn"
    | "abort-episode";
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
  cartographerStatus: "not-run" | "ready" | "running" | "failed";
  lastCheckedAt: string | null;
  actions: NitroMapReconciliationAction[];
}

interface NitroMapReconciliationActionBase {
  id: string;
  status: NitroReconciliationActionStatus;
  title: string;
  reason: string;
  targetId: string;
  targetKind: "agent" | "resource" | "responsibility" | "ownership-edge" | "supervision-edge";
}

export type NitroMapReconciliationAction =
  | (NitroMapReconciliationActionBase & {
      actionKind: "update-responsibility";
      targetKind: "responsibility";
      proposedResponsibilityStatus?: NitroResponsibilityStatus;
    })
  | (NitroMapReconciliationActionBase & {
      actionKind:
        | "create-agent"
        | "update-agent"
        | "delete-agent"
        | "create-resource"
        | "update-resource"
        | "delete-resource"
        | "create-responsibility"
        | "delete-responsibility"
        | "create-ownership-edge"
        | "delete-ownership-edge"
        | "create-supervision-edge"
        | "delete-supervision-edge";
    });

export interface NitroIntervention {
  id: string;
  status: NitroInterventionStatus;
  severity: "info" | "warning" | "blocking";
  title: string;
  summary: string;
  source:
    | {
        kind: "ownership-agent";
        agentId: string;
      }
    | {
        kind: "work-episode";
        episodeId: string;
      }
    | {
        kind: "cartographer";
      }
    | {
        kind: "system";
      }
    | null;
  episodeId: string | null;
  roundId: string | null;
  relatedResourceIds: string[];
  relatedResponsibilityIds: string[];
  createdAt: string;
  resolvedAt: string | null;
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
  | { kind: "intervention"; id: string }
  | { kind: "reconciliation-action"; id: string };
