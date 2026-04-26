import { Schema } from "effect";
import {
  EnvironmentId,
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";

const makeNitroMapId = <Brand extends string>(brand: Brand) => {
  return TrimmedNonEmptyString.pipe(Schema.brand(brand));
};

export const NitroMapResourceId = makeNitroMapId("NitroMapResourceId");
export type NitroMapResourceId = typeof NitroMapResourceId.Type;
export const NitroMapAgentId = makeNitroMapId("NitroMapAgentId");
export type NitroMapAgentId = typeof NitroMapAgentId.Type;
export const NitroMapResponsibilityId = makeNitroMapId("NitroMapResponsibilityId");
export type NitroMapResponsibilityId = typeof NitroMapResponsibilityId.Type;
export const NitroMapOwnershipEdgeId = makeNitroMapId("NitroMapOwnershipEdgeId");
export type NitroMapOwnershipEdgeId = typeof NitroMapOwnershipEdgeId.Type;
export const NitroMapSupervisionEdgeId = makeNitroMapId("NitroMapSupervisionEdgeId");
export type NitroMapSupervisionEdgeId = typeof NitroMapSupervisionEdgeId.Type;
export const NitroMapEpisodeId = makeNitroMapId("NitroMapEpisodeId");
export type NitroMapEpisodeId = typeof NitroMapEpisodeId.Type;
export const NitroMapRoundId = makeNitroMapId("NitroMapRoundId");
export type NitroMapRoundId = typeof NitroMapRoundId.Type;
export const NitroMapTraceId = makeNitroMapId("NitroMapTraceId");
export type NitroMapTraceId = typeof NitroMapTraceId.Type;
export const NitroMapInvocationId = makeNitroMapId("NitroMapInvocationId");
export type NitroMapInvocationId = typeof NitroMapInvocationId.Type;
export const NitroMapBlockingItemId = makeNitroMapId("NitroMapBlockingItemId");
export type NitroMapBlockingItemId = typeof NitroMapBlockingItemId.Type;
export const NitroMapInterventionId = makeNitroMapId("NitroMapInterventionId");
export type NitroMapInterventionId = typeof NitroMapInterventionId.Type;
export const NitroMapReconciliationActionId = makeNitroMapId("NitroMapReconciliationActionId");
export type NitroMapReconciliationActionId = typeof NitroMapReconciliationActionId.Type;

export const NitroMapProjectRef = Schema.Struct({
  environmentId: EnvironmentId,
  projectId: ProjectId,
});
export type NitroMapProjectRef = typeof NitroMapProjectRef.Type;

export const NitroMapGetProjectSnapshotInput = NitroMapProjectRef;
export type NitroMapGetProjectSnapshotInput = typeof NitroMapGetProjectSnapshotInput.Type;
export const NitroMapSubscribeProjectInput = Schema.Struct({
  environmentId: EnvironmentId,
  projectId: ProjectId,
  lastSequence: Schema.optionalKey(NonNegativeInt),
  lastProjectVersion: Schema.optionalKey(NonNegativeInt),
}).check(
  Schema.makeFilter((input) => {
    const hasLastSequence = input.lastSequence !== undefined;
    const hasLastProjectVersion = input.lastProjectVersion !== undefined;
    return hasLastSequence === hasLastProjectVersion
      ? true
      : "NitroMap subscription resume cursors require both lastSequence and lastProjectVersion";
  }),
);
export type NitroMapSubscribeProjectInput = typeof NitroMapSubscribeProjectInput.Type;

export const NITROMAP_WS_METHODS = {
  getProjectSnapshot: "nitromap.getProjectSnapshot",
  subscribeProject: "nitromap.subscribeProject",
} as const;

export class NitroMapProjectionError extends Schema.TaggedErrorClass<NitroMapProjectionError>()(
  "NitroMapProjectionError",
  {
    message: TrimmedNonEmptyString,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export const NitroMapResourceKind = Schema.Literals([
  "file",
  "folder",
  "generated-asset",
  "remote-resource",
  "logical-component",
]);
export type NitroMapResourceKind = typeof NitroMapResourceKind.Type;

export const NitroMapAgentKind = Schema.Literals(["management", "implementation"]);
export type NitroMapAgentKind = typeof NitroMapAgentKind.Type;

export const NitroMapAgentStatus = Schema.Literals([
  "idle",
  "working",
  "waiting",
  "blocked",
  "failed",
]);
export type NitroMapAgentStatus = typeof NitroMapAgentStatus.Type;

export const NitroMapResponsibilityStatus = Schema.Literals(["owned", "watched", "disputed"]);
export type NitroMapResponsibilityStatus = typeof NitroMapResponsibilityStatus.Type;

export const NitroMapPoint = Schema.Struct({
  x: NonNegativeInt,
  y: NonNegativeInt,
});
export type NitroMapPoint = typeof NitroMapPoint.Type;

export const NitroMapResource = Schema.Struct({
  resourceId: NitroMapResourceId,
  label: TrimmedNonEmptyString,
  kind: NitroMapResourceKind,
  locator: TrimmedNonEmptyString,
  position: Schema.optionalKey(NitroMapPoint),
});
export type NitroMapResource = typeof NitroMapResource.Type;

export const NitroMapOwnershipAgent = Schema.Struct({
  agentId: NitroMapAgentId,
  label: TrimmedNonEmptyString,
  kind: NitroMapAgentKind,
  purpose: TrimmedNonEmptyString,
  status: NitroMapAgentStatus,
  position: Schema.optionalKey(NitroMapPoint),
});
export type NitroMapOwnershipAgent = typeof NitroMapOwnershipAgent.Type;

export const NitroMapResponsibilityQuery = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("path-glob"),
    patterns: Schema.NonEmptyArray(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    kind: Schema.Literal("path-set"),
    paths: Schema.NonEmptyArray(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    kind: Schema.Literal("event-query"),
    eventKinds: Schema.NonEmptyArray(TrimmedNonEmptyString),
    resourceLocator: Schema.optionalKey(TrimmedNonEmptyString),
  }),
  Schema.Struct({
    kind: Schema.Literal("derived"),
    source: Schema.Literals(["mock", "future-indexer"]),
    description: TrimmedNonEmptyString,
  }),
]);
export type NitroMapResponsibilityQuery = typeof NitroMapResponsibilityQuery.Type;

export const NitroMapResponsibility = Schema.Struct({
  responsibilityId: NitroMapResponsibilityId,
  agentId: NitroMapAgentId,
  label: TrimmedNonEmptyString,
  status: NitroMapResponsibilityStatus,
  query: NitroMapResponsibilityQuery,
  rationale: TrimmedNonEmptyString,
});
export type NitroMapResponsibility = typeof NitroMapResponsibility.Type;

export const NitroMapOwnershipEdge = Schema.Struct({
  edgeId: NitroMapOwnershipEdgeId,
  responsibilityId: NitroMapResponsibilityId,
  agentId: NitroMapAgentId,
  resourceId: NitroMapResourceId,
});
export type NitroMapOwnershipEdge = typeof NitroMapOwnershipEdge.Type;

export const NitroMapSupervisionEdge = Schema.Struct({
  edgeId: NitroMapSupervisionEdgeId,
  supervisingAgentId: NitroMapAgentId,
  supervisedAgentId: NitroMapAgentId,
});
export type NitroMapSupervisionEdge = typeof NitroMapSupervisionEdge.Type;

export const NitroMapReconciliationActionStatus = Schema.Literals([
  "proposed",
  "accepted",
  "declined",
  "applied",
]);
export type NitroMapReconciliationActionStatus = typeof NitroMapReconciliationActionStatus.Type;

export const NitroMapReconciliationTargetKind = Schema.Literals([
  "agent",
  "resource",
  "responsibility",
  "ownership-edge",
  "supervision-edge",
]);
export type NitroMapReconciliationTargetKind = typeof NitroMapReconciliationTargetKind.Type;

export const NitroMapReconciliationActionKind = Schema.Literals([
  "create-agent",
  "update-agent",
  "delete-agent",
  "create-resource",
  "update-resource",
  "delete-resource",
  "create-responsibility",
  "update-responsibility",
  "delete-responsibility",
  "create-ownership-edge",
  "delete-ownership-edge",
  "create-supervision-edge",
  "delete-supervision-edge",
]);
export type NitroMapReconciliationActionKind = typeof NitroMapReconciliationActionKind.Type;

export const NitroMapAgentReconciliationChange = Schema.Struct({
  targetKind: Schema.Literal("agent"),
  targetId: NitroMapAgentId,
  before: Schema.NullOr(NitroMapOwnershipAgent),
  after: Schema.NullOr(NitroMapOwnershipAgent),
});
export type NitroMapAgentReconciliationChange = typeof NitroMapAgentReconciliationChange.Type;

export const NitroMapResourceReconciliationChange = Schema.Struct({
  targetKind: Schema.Literal("resource"),
  targetId: NitroMapResourceId,
  before: Schema.NullOr(NitroMapResource),
  after: Schema.NullOr(NitroMapResource),
});
export type NitroMapResourceReconciliationChange = typeof NitroMapResourceReconciliationChange.Type;

export const NitroMapResponsibilityReconciliationChange = Schema.Struct({
  targetKind: Schema.Literal("responsibility"),
  targetId: NitroMapResponsibilityId,
  before: Schema.NullOr(NitroMapResponsibility),
  after: Schema.NullOr(NitroMapResponsibility),
});
export type NitroMapResponsibilityReconciliationChange =
  typeof NitroMapResponsibilityReconciliationChange.Type;

export const NitroMapOwnershipEdgeReconciliationChange = Schema.Struct({
  targetKind: Schema.Literal("ownership-edge"),
  targetId: NitroMapOwnershipEdgeId,
  before: Schema.NullOr(NitroMapOwnershipEdge),
  after: Schema.NullOr(NitroMapOwnershipEdge),
});
export type NitroMapOwnershipEdgeReconciliationChange =
  typeof NitroMapOwnershipEdgeReconciliationChange.Type;

export const NitroMapSupervisionEdgeReconciliationChange = Schema.Struct({
  targetKind: Schema.Literal("supervision-edge"),
  targetId: NitroMapSupervisionEdgeId,
  before: Schema.NullOr(NitroMapSupervisionEdge),
  after: Schema.NullOr(NitroMapSupervisionEdge),
});
export type NitroMapSupervisionEdgeReconciliationChange =
  typeof NitroMapSupervisionEdgeReconciliationChange.Type;

export const NitroMapReconciliationChange = Schema.Union([
  NitroMapAgentReconciliationChange,
  NitroMapResourceReconciliationChange,
  NitroMapResponsibilityReconciliationChange,
  NitroMapOwnershipEdgeReconciliationChange,
  NitroMapSupervisionEdgeReconciliationChange,
]);
export type NitroMapReconciliationChange = typeof NitroMapReconciliationChange.Type;

const NitroMapReconciliationActionBaseFields = {
  actionId: NitroMapReconciliationActionId,
  status: NitroMapReconciliationActionStatus,
  title: TrimmedNonEmptyString,
  reason: TrimmedNonEmptyString,
  createdAt: IsoDateTime,
  appliedAt: Schema.NullOr(IsoDateTime),
};

const getReconciliationEntityId = (
  targetKind: NitroMapReconciliationTargetKind,
  value: unknown,
): string | null => {
  if (value === null || typeof value !== "object") return null;

  switch (targetKind) {
    case "agent":
      return "agentId" in value && typeof value.agentId === "string" ? value.agentId : null;
    case "resource":
      return "resourceId" in value && typeof value.resourceId === "string"
        ? value.resourceId
        : null;
    case "responsibility":
      return "responsibilityId" in value && typeof value.responsibilityId === "string"
        ? value.responsibilityId
        : null;
    case "ownership-edge":
    case "supervision-edge":
      return "edgeId" in value && typeof value.edgeId === "string" ? value.edgeId : null;
  }
};

const hasUniqueValues = (values: readonly string[]) => values.length === new Set(values).size;

const ownershipRelationKey = (edge: {
  readonly responsibilityId: string;
  readonly agentId: string;
  readonly resourceId: string;
}) => `${edge.responsibilityId}:${edge.agentId}:${edge.resourceId}`;

const ownershipRelationKeyFromUnknown = (value: unknown): string | null => {
  if (value === null || typeof value !== "object") return null;
  const responsibilityId =
    "responsibilityId" in value && typeof value.responsibilityId === "string"
      ? value.responsibilityId
      : null;
  const agentId = "agentId" in value && typeof value.agentId === "string" ? value.agentId : null;
  const resourceId =
    "resourceId" in value && typeof value.resourceId === "string" ? value.resourceId : null;
  return responsibilityId && agentId && resourceId
    ? ownershipRelationKey({ responsibilityId, agentId, resourceId })
    : null;
};

const validatesReconciliationPayloadReferences = (
  targetKind: NitroMapReconciliationTargetKind,
  value: unknown,
  refs: {
    agentIds: Set<string>;
    agentKindById: Map<string, NitroMapAgentKind>;
    resourceIds: Set<string>;
    responsibilityIds: Set<string>;
    responsibilityAgentById: Map<string, string>;
  },
) => {
  if (value === null || typeof value !== "object") return true;

  switch (targetKind) {
    case "agent":
    case "resource":
      return true;
    case "responsibility":
      return (
        "agentId" in value && typeof value.agentId === "string" && refs.agentIds.has(value.agentId)
      );
    case "ownership-edge": {
      const responsibilityId =
        "responsibilityId" in value && typeof value.responsibilityId === "string"
          ? value.responsibilityId
          : null;
      const agentId =
        "agentId" in value && typeof value.agentId === "string" ? value.agentId : null;
      return (
        agentId !== null &&
        refs.agentIds.has(agentId) &&
        "resourceId" in value &&
        typeof value.resourceId === "string" &&
        refs.resourceIds.has(value.resourceId) &&
        responsibilityId !== null &&
        refs.responsibilityIds.has(responsibilityId) &&
        refs.responsibilityAgentById.get(responsibilityId) === agentId
      );
    }
    case "supervision-edge":
      return (
        "supervisingAgentId" in value &&
        typeof value.supervisingAgentId === "string" &&
        refs.agentIds.has(value.supervisingAgentId) &&
        refs.agentKindById.get(value.supervisingAgentId) === "management" &&
        "supervisedAgentId" in value &&
        typeof value.supervisedAgentId === "string" &&
        refs.agentIds.has(value.supervisedAgentId)
      );
  }
};

const validatesReconciliationAction = (action: {
  actionKind: string;
  status: NitroMapReconciliationActionStatus;
  targetId: string;
  targetKind: NitroMapReconciliationTargetKind;
  appliedAt: string | null;
  changes: readonly {
    targetId: string;
    before: unknown | null;
    after: unknown | null;
  }[];
}) => {
  if (action.status === "applied") {
    if (action.appliedAt === null) return "Applied reconciliation actions require appliedAt";
  } else if (action.appliedAt !== null) {
    return "Only applied reconciliation actions may set appliedAt";
  }

  for (const change of action.changes) {
    if (change.targetId !== action.targetId) {
      return "Reconciliation change targetId must match the action targetId";
    }

    const beforeId = getReconciliationEntityId(action.targetKind, change.before);
    if (change.before !== null && beforeId !== action.targetId) {
      return "Reconciliation before payload id must match the action targetId";
    }
    const afterId = getReconciliationEntityId(action.targetKind, change.after);
    if (change.after !== null && afterId !== action.targetId) {
      return "Reconciliation after payload id must match the action targetId";
    }

    if (action.actionKind.startsWith("create-")) {
      if (change.before !== null || change.after === null) {
        return "Create reconciliation actions require before=null and after!=null";
      }
    } else if (action.actionKind.startsWith("update-")) {
      if (change.before === null || change.after === null) {
        return "Update reconciliation actions require before and after";
      }
      if (JSON.stringify(change.before) === JSON.stringify(change.after)) {
        return "Update reconciliation actions require a changed after payload";
      }
    } else if (action.actionKind.startsWith("delete-")) {
      if (change.before === null || change.after !== null) {
        return "Delete reconciliation actions require before!=null and after=null";
      }
    }
  }

  return true;
};

export const NitroMapReconciliationAction = Schema.Union([
  Schema.Struct({
    ...NitroMapReconciliationActionBaseFields,
    actionKind: Schema.Literals(["create-agent", "update-agent", "delete-agent"]),
    targetKind: Schema.Literal("agent"),
    targetId: NitroMapAgentId,
    changes: Schema.NonEmptyArray(NitroMapAgentReconciliationChange),
  }).check(Schema.makeFilter(validatesReconciliationAction)),
  Schema.Struct({
    ...NitroMapReconciliationActionBaseFields,
    actionKind: Schema.Literals(["create-resource", "update-resource", "delete-resource"]),
    targetKind: Schema.Literal("resource"),
    targetId: NitroMapResourceId,
    changes: Schema.NonEmptyArray(NitroMapResourceReconciliationChange),
  }).check(Schema.makeFilter(validatesReconciliationAction)),
  Schema.Struct({
    ...NitroMapReconciliationActionBaseFields,
    actionKind: Schema.Literals([
      "create-responsibility",
      "update-responsibility",
      "delete-responsibility",
    ]),
    targetKind: Schema.Literal("responsibility"),
    targetId: NitroMapResponsibilityId,
    changes: Schema.NonEmptyArray(NitroMapResponsibilityReconciliationChange),
  }).check(Schema.makeFilter(validatesReconciliationAction)),
  Schema.Struct({
    ...NitroMapReconciliationActionBaseFields,
    actionKind: Schema.Literals(["create-ownership-edge", "delete-ownership-edge"]),
    targetKind: Schema.Literal("ownership-edge"),
    targetId: NitroMapOwnershipEdgeId,
    changes: Schema.NonEmptyArray(NitroMapOwnershipEdgeReconciliationChange),
  }).check(Schema.makeFilter(validatesReconciliationAction)),
  Schema.Struct({
    ...NitroMapReconciliationActionBaseFields,
    actionKind: Schema.Literals(["create-supervision-edge", "delete-supervision-edge"]),
    targetKind: Schema.Literal("supervision-edge"),
    targetId: NitroMapSupervisionEdgeId,
    changes: Schema.NonEmptyArray(NitroMapSupervisionEdgeReconciliationChange),
  }).check(Schema.makeFilter(validatesReconciliationAction)),
]);
export type NitroMapReconciliationAction = typeof NitroMapReconciliationAction.Type;

export const NitroMapCartographerStatus = Schema.Literals([
  "not-run",
  "ready",
  "running",
  "failed",
]);
export type NitroMapCartographerStatus = typeof NitroMapCartographerStatus.Type;

export const NitroMapMaintenanceSummary = Schema.Struct({
  cartographerStatus: NitroMapCartographerStatus,
  lastCheckedAt: Schema.NullOr(IsoDateTime),
  actions: Schema.Array(NitroMapReconciliationAction),
});
export type NitroMapMaintenanceSummary = typeof NitroMapMaintenanceSummary.Type;

export const NitroMapBlockingItemSeverity = Schema.Literals(["info", "warning", "blocking"]);
export type NitroMapBlockingItemSeverity = typeof NitroMapBlockingItemSeverity.Type;

export const NitroMapWorkEpisodeActionKind = Schema.Literals([
  "open-transcript",
  "open-diff",
  "open-terminal",
  "open-failure-detail",
  "answer-input",
  "decide-approval",
  "retry-turn",
  "abort-episode",
]);
export type NitroMapWorkEpisodeActionKind = typeof NitroMapWorkEpisodeActionKind.Type;

export const NitroMapWorkEpisodeAction = Schema.Struct({
  kind: NitroMapWorkEpisodeActionKind,
  label: TrimmedNonEmptyString,
  disabled: Schema.Boolean,
});
export type NitroMapWorkEpisodeAction = typeof NitroMapWorkEpisodeAction.Type;

export const NitroMapBlockingItem = Schema.Struct({
  blockingItemId: NitroMapBlockingItemId,
  kind: Schema.Literals(["approval", "input", "terminal", "diff", "failed-turn"]),
  severity: NitroMapBlockingItemSeverity,
  label: TrimmedNonEmptyString,
  sourceEventId: Schema.NullOr(TrimmedNonEmptyString),
  primaryAction: Schema.NullOr(NitroMapWorkEpisodeAction),
  secondaryActions: Schema.Array(NitroMapWorkEpisodeAction),
});
export type NitroMapBlockingItem = typeof NitroMapBlockingItem.Type;

export const NitroMapInterventionStatus = Schema.Literals(["open", "accepted", "declined"]);
export type NitroMapInterventionStatus = typeof NitroMapInterventionStatus.Type;

export const NitroMapInterventionSeverity = Schema.Literals(["info", "warning", "blocking"]);
export type NitroMapInterventionSeverity = typeof NitroMapInterventionSeverity.Type;

export const NitroMapInterventionSource = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("ownership-agent"),
    agentId: NitroMapAgentId,
  }),
  Schema.Struct({
    kind: Schema.Literal("work-episode"),
    episodeId: NitroMapEpisodeId,
  }),
  Schema.Struct({
    kind: Schema.Literal("cartographer"),
  }),
  Schema.Struct({
    kind: Schema.Literal("system"),
  }),
]);
export type NitroMapInterventionSource = typeof NitroMapInterventionSource.Type;

export const NitroMapIntervention = Schema.Struct({
  interventionId: NitroMapInterventionId,
  status: NitroMapInterventionStatus,
  severity: NitroMapInterventionSeverity,
  title: TrimmedNonEmptyString,
  summary: TrimmedNonEmptyString,
  source: Schema.NullOr(NitroMapInterventionSource),
  episodeId: Schema.NullOr(NitroMapEpisodeId),
  roundId: Schema.NullOr(NitroMapRoundId),
  relatedResourceIds: Schema.Array(NitroMapResourceId),
  relatedResponsibilityIds: Schema.Array(NitroMapResponsibilityId),
  createdAt: IsoDateTime,
  resolvedAt: Schema.NullOr(IsoDateTime),
});
export type NitroMapIntervention = typeof NitroMapIntervention.Type;

export const NitroMapEpisodeStatus = Schema.Literals([
  "idle",
  "running",
  "blocked",
  "failed",
  "completed",
  "aborting",
  "aborted",
]);
export type NitroMapEpisodeStatus = typeof NitroMapEpisodeStatus.Type;

export const NitroMapMainAgentStatus = Schema.Literals([
  "idle",
  "running",
  "waiting-for-ownership",
  "waiting-for-user",
  "failed",
  "completed",
  "aborting",
  "aborted",
]);
export type NitroMapMainAgentStatus = typeof NitroMapMainAgentStatus.Type;

export const NitroMapRoundStatus = Schema.Literals([
  "running",
  "waiting",
  "blocked",
  "completed",
  "failed",
  "aborting",
  "aborted",
]);
export type NitroMapRoundStatus = typeof NitroMapRoundStatus.Type;

export const NitroMapInvocationTrigger = Schema.Literals([
  "file-match",
  "supervision-response",
  "manual",
]);
export type NitroMapInvocationTrigger = typeof NitroMapInvocationTrigger.Type;

export const NitroMapInvocationStatus = Schema.Literals([
  "queued",
  "running",
  "responded",
  "no-response",
  "failed",
  "aborted",
]);
export type NitroMapInvocationStatus = typeof NitroMapInvocationStatus.Type;

export const NitroMapOwnershipAgentResponse = Schema.Struct({
  invocationId: NitroMapInvocationId,
  roundId: NitroMapRoundId,
  traceId: NitroMapTraceId,
  agentId: NitroMapAgentId,
  parentInvocationId: Schema.NullOr(NitroMapInvocationId),
  trigger: NitroMapInvocationTrigger,
  status: NitroMapInvocationStatus,
  summary: TrimmedNonEmptyString,
  startedAt: Schema.NullOr(IsoDateTime),
  completedAt: Schema.NullOr(IsoDateTime),
  position: Schema.optionalKey(NitroMapPoint),
});
export type NitroMapOwnershipAgentResponse = typeof NitroMapOwnershipAgentResponse.Type;

export const NitroMapTraceStatus = Schema.Literals([
  "pending",
  "injected",
  "failure-injected",
  "not-injected",
  "aborted",
  "failed",
]);
export type NitroMapTraceStatus = typeof NitroMapTraceStatus.Type;

export const NitroMapRoundTrace = Schema.Struct({
  traceId: NitroMapTraceId,
  roundId: NitroMapRoundId,
  status: NitroMapTraceStatus,
  title: TrimmedNonEmptyString,
  summary: TrimmedNonEmptyString,
  rootInvocationId: NitroMapInvocationId,
  invocationIds: Schema.Array(NitroMapInvocationId),
  insertedAt: Schema.NullOr(IsoDateTime),
});
export type NitroMapRoundTrace = typeof NitroMapRoundTrace.Type;

export const NitroMapWorkRound = Schema.Struct({
  roundId: NitroMapRoundId,
  episodeId: NitroMapEpisodeId,
  index: NonNegativeInt,
  title: TrimmedNonEmptyString,
  status: NitroMapRoundStatus,
  startedByMessageId: MessageId,
  startedByUserMessage: TrimmedNonEmptyString,
  resultMessageId: Schema.NullOr(MessageId),
  startedAt: IsoDateTime,
  completedAt: Schema.NullOr(IsoDateTime),
  traces: Schema.Array(NitroMapRoundTrace),
  invocations: Schema.Array(NitroMapOwnershipAgentResponse),
});
export type NitroMapWorkRound = typeof NitroMapWorkRound.Type;

export const NitroMapWorkEpisode = Schema.Struct({
  episodeId: NitroMapEpisodeId,
  environmentId: EnvironmentId,
  projectId: ProjectId,
  conversationThreadId: ThreadId,
  startedFromMessageId: MessageId,
  backingThreadId: Schema.NullOr(ThreadId),
  transcriptRoute: Schema.NullOr(TrimmedNonEmptyString),
  title: TrimmedNonEmptyString,
  status: NitroMapEpisodeStatus,
  mainAgent: Schema.Struct({
    mainAgentId: TrimmedNonEmptyString,
    label: TrimmedNonEmptyString,
    status: NitroMapMainAgentStatus,
  }),
  latestUserMessage: TrimmedNonEmptyString,
  blockingItems: Schema.Array(NitroMapBlockingItem),
  rounds: Schema.Array(NitroMapWorkRound),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type NitroMapWorkEpisode = typeof NitroMapWorkEpisode.Type;

const NitroMapSnapshotShape = Schema.Struct({
  environmentId: EnvironmentId,
  projectId: ProjectId,
  projectName: TrimmedNonEmptyString,
  version: NonNegativeInt,
  generatedAt: IsoDateTime,
  resources: Schema.Array(NitroMapResource),
  agents: Schema.Array(NitroMapOwnershipAgent),
  responsibilities: Schema.Array(NitroMapResponsibility),
  ownershipEdges: Schema.Array(NitroMapOwnershipEdge),
  supervisionEdges: Schema.Array(NitroMapSupervisionEdge),
  interventions: Schema.Array(NitroMapIntervention),
  workEpisodes: Schema.Array(NitroMapWorkEpisode),
  mapMaintenance: NitroMapMaintenanceSummary,
});

export const NitroMapSnapshot = NitroMapSnapshotShape.check(
  Schema.makeFilter((snapshot) => {
    const agentIds = new Set(snapshot.agents.map((agent) => agent.agentId));
    const resourceIds = new Set(snapshot.resources.map((resource) => resource.resourceId));
    const responsibilityIds = new Set(
      snapshot.responsibilities.map((responsibility) => responsibility.responsibilityId),
    );
    const episodeIds = new Set(snapshot.workEpisodes.map((episode) => episode.episodeId));
    const roundIdList = snapshot.workEpisodes.flatMap((episode) =>
      episode.rounds.map((round) => round.roundId),
    );
    const roundIds = new Set(roundIdList);
    const ownershipEdgeIds = snapshot.ownershipEdges.map((edge) => edge.edgeId);
    const supervisionEdgeIds = snapshot.supervisionEdges.map((edge) => edge.edgeId);
    const interventionIds = snapshot.interventions.map(
      (intervention) => intervention.interventionId,
    );
    const reconciliationActionIds = snapshot.mapMaintenance.actions.map(
      (action) => action.actionId,
    );
    const ownershipRelationKeys = snapshot.ownershipEdges.map((edge) => ownershipRelationKey(edge));
    const traceIdList = snapshot.workEpisodes.flatMap((episode) =>
      episode.rounds.flatMap((round) => round.traces.map((trace) => trace.traceId)),
    );
    const invocationIdList = snapshot.workEpisodes.flatMap((episode) =>
      episode.rounds.flatMap((round) =>
        round.invocations.map((invocation) => invocation.invocationId),
      ),
    );
    const blockingItemIds = snapshot.workEpisodes.flatMap((episode) =>
      episode.blockingItems.map((item) => item.blockingItemId),
    );

    if (
      !hasUniqueValues(snapshot.agents.map((agent) => agent.agentId)) ||
      !hasUniqueValues(snapshot.resources.map((resource) => resource.resourceId)) ||
      !hasUniqueValues(
        snapshot.responsibilities.map((responsibility) => responsibility.responsibilityId),
      ) ||
      !hasUniqueValues(ownershipEdgeIds) ||
      !hasUniqueValues(supervisionEdgeIds) ||
      !hasUniqueValues(interventionIds) ||
      !hasUniqueValues(reconciliationActionIds) ||
      !hasUniqueValues(traceIdList) ||
      !hasUniqueValues(invocationIdList) ||
      !hasUniqueValues(blockingItemIds) ||
      !hasUniqueValues(snapshot.workEpisodes.map((episode) => episode.episodeId)) ||
      !hasUniqueValues(roundIdList)
    ) {
      return "NitroMap snapshots must not contain duplicate ids";
    }
    if (!hasUniqueValues(ownershipRelationKeys)) {
      return "NitroMap ownership edges must not duplicate responsibility, agent, and resource relations";
    }
    const roundEpisodeById = new Map(
      snapshot.workEpisodes.flatMap((episode) =>
        episode.rounds.map((round) => [round.roundId, episode.episodeId] as const),
      ),
    );
    const existingIdsByTargetKind = {
      agent: agentIds,
      resource: resourceIds,
      responsibility: responsibilityIds,
      "ownership-edge": new Set(ownershipEdgeIds),
      "supervision-edge": new Set(supervisionEdgeIds),
    } satisfies Record<NitroMapReconciliationTargetKind, Set<string>>;
    const responsibilityAgentById = new Map(
      snapshot.responsibilities.map((responsibility) => [
        responsibility.responsibilityId,
        responsibility.agentId,
      ]),
    );
    const agentKindById = new Map(snapshot.agents.map((agent) => [agent.agentId, agent.kind]));

    if (snapshot.responsibilities.some((responsibility) => !agentIds.has(responsibility.agentId))) {
      return "NitroMap responsibilities must reference existing agents";
    }
    if (
      snapshot.ownershipEdges.some(
        (edge) =>
          !responsibilityIds.has(edge.responsibilityId) ||
          !agentIds.has(edge.agentId) ||
          !resourceIds.has(edge.resourceId) ||
          responsibilityAgentById.get(edge.responsibilityId) !== edge.agentId,
      )
    ) {
      return "NitroMap ownership edges must reference existing responsibilities, agents, resources, and responsibility agents";
    }
    if (
      snapshot.supervisionEdges.some(
        (edge) =>
          !agentIds.has(edge.supervisingAgentId) ||
          !agentIds.has(edge.supervisedAgentId) ||
          agentKindById.get(edge.supervisingAgentId) !== "management",
      )
    ) {
      return "NitroMap supervision edges must reference existing agents and management supervisors";
    }
    if (snapshot.resources.some((resource) => resource.position === undefined)) {
      return "NitroMap resources require layout positions";
    }
    if (snapshot.agents.some((agent) => agent.position === undefined)) {
      return "NitroMap ownership agents require layout positions";
    }
    for (const responsibility of snapshot.responsibilities) {
      const edgeCount = snapshot.ownershipEdges.filter(
        (edge) => edge.responsibilityId === responsibility.responsibilityId,
      ).length;
      if (edgeCount < 1) {
        return "NitroMap responsibilities require at least one ownership edge";
      }
    }

    for (const episode of snapshot.workEpisodes) {
      if (
        episode.environmentId !== snapshot.environmentId ||
        episode.projectId !== snapshot.projectId
      ) {
        return "NitroMap work episodes must belong to the snapshot project";
      }
      for (const round of episode.rounds) {
        if (round.episodeId !== episode.episodeId) {
          return "NitroMap work rounds must reference their containing episode";
        }
        const roundInvocationIds = new Set(
          round.invocations.map((invocation) => invocation.invocationId),
        );
        const roundTraceIds = new Set(round.traces.map((trace) => trace.traceId));
        for (const invocation of round.invocations) {
          if (
            invocation.roundId !== round.roundId ||
            !agentIds.has(invocation.agentId) ||
            !roundTraceIds.has(invocation.traceId)
          ) {
            return "NitroMap ownership-agent responses must reference their round, trace, and agent";
          }
          if (
            invocation.parentInvocationId !== null &&
            !roundInvocationIds.has(invocation.parentInvocationId)
          ) {
            return "NitroMap ownership-agent response parents must be in the same round";
          }
          if (invocation.position === undefined) {
            return "NitroMap ownership-agent responses require layout positions";
          }
        }
        for (const trace of round.traces) {
          if (
            trace.roundId !== round.roundId ||
            !roundInvocationIds.has(trace.rootInvocationId) ||
            trace.invocationIds.some((invocationId) => !roundInvocationIds.has(invocationId))
          ) {
            return "NitroMap round traces must reference invocations in the same round";
          }
        }
      }
    }

    for (const intervention of snapshot.interventions) {
      if (intervention.episodeId !== null && !episodeIds.has(intervention.episodeId)) {
        return "NitroMap interventions must reference existing episodes";
      }
      if (intervention.roundId !== null && !roundIds.has(intervention.roundId)) {
        return "NitroMap interventions must reference existing rounds";
      }
      if (
        intervention.episodeId !== null &&
        intervention.roundId !== null &&
        roundEpisodeById.get(intervention.roundId) !== intervention.episodeId
      ) {
        return "NitroMap intervention rounds must belong to their referenced episode";
      }
      if (
        intervention.source?.kind === "ownership-agent" &&
        !agentIds.has(intervention.source.agentId)
      ) {
        return "NitroMap ownership-agent intervention sources must reference existing agents";
      }
      if (
        intervention.source?.kind === "work-episode" &&
        !episodeIds.has(intervention.source.episodeId)
      ) {
        return "NitroMap work-episode intervention sources must reference existing episodes";
      }
      if (
        intervention.source?.kind === "work-episode" &&
        intervention.episodeId !== null &&
        intervention.source.episodeId !== intervention.episodeId
      ) {
        return "NitroMap work-episode intervention sources must match the intervention episode";
      }
      if (intervention.source?.kind === "work-episode" && intervention.episodeId === null) {
        return "NitroMap work-episode intervention sources require an intervention episode";
      }
      if (intervention.relatedResourceIds.some((resourceId) => !resourceIds.has(resourceId))) {
        return "NitroMap interventions must reference existing resources";
      }
      if (
        intervention.relatedResponsibilityIds.some(
          (responsibilityId) => !responsibilityIds.has(responsibilityId),
        )
      ) {
        return "NitroMap interventions must reference existing responsibilities";
      }
    }

    const proposedOwnershipRelationKeys = new Set<string>();
    for (const action of snapshot.mapMaintenance.actions) {
      const targetExists = (existingIdsByTargetKind[action.targetKind] as Set<string>).has(
        action.targetId,
      );
      if (action.actionKind.startsWith("create-") && targetExists) {
        return "NitroMap create reconciliation actions must not target existing map ids";
      }
      if (!action.actionKind.startsWith("create-") && !targetExists) {
        return "NitroMap update/delete reconciliation actions must target existing map ids";
      }
      for (const change of action.changes) {
        if (
          !validatesReconciliationPayloadReferences(action.targetKind, change.before, {
            agentIds,
            agentKindById,
            resourceIds,
            responsibilityIds,
            responsibilityAgentById,
          }) ||
          !validatesReconciliationPayloadReferences(action.targetKind, change.after, {
            agentIds,
            agentKindById,
            resourceIds,
            responsibilityIds,
            responsibilityAgentById,
          })
        ) {
          return "NitroMap reconciliation payloads must reference existing map ids";
        }
        if (action.actionKind === "create-ownership-edge" && change.after !== null) {
          const relationKey = ownershipRelationKeyFromUnknown(change.after);
          if (!relationKey) {
            return "NitroMap ownership-edge reconciliation payloads must define ownership relations";
          }
          if (
            ownershipRelationKeys.includes(relationKey) ||
            proposedOwnershipRelationKeys.has(relationKey)
          ) {
            return "NitroMap ownership-edge reconciliation payloads must not duplicate responsibility, agent, and resource relations";
          }
          proposedOwnershipRelationKeys.add(relationKey);
        }
      }
    }

    return true;
  }),
);
export type NitroMapSnapshot = typeof NitroMapSnapshot.Type;

export const NitroMapProjectSnapshot = NitroMapSnapshot;
export type NitroMapProjectSnapshot = typeof NitroMapProjectSnapshot.Type;

export const NitroMapSubscriptionEnvelope = Schema.Struct({
  environmentId: EnvironmentId,
  projectId: ProjectId,
  sequence: NonNegativeInt,
  projectVersion: NonNegativeInt,
  emittedAt: IsoDateTime,
});
export type NitroMapSubscriptionEnvelope = typeof NitroMapSubscriptionEnvelope.Type;

const NitroMapSubscriptionEventShape = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("nitromap.snapshot"),
    environmentId: EnvironmentId,
    projectId: ProjectId,
    sequence: NonNegativeInt,
    projectVersion: NonNegativeInt,
    emittedAt: IsoDateTime,
    snapshot: NitroMapSnapshot,
  }),
  Schema.Struct({
    type: Schema.Literal("nitromap.stale"),
    environmentId: EnvironmentId,
    projectId: ProjectId,
    sequence: NonNegativeInt,
    projectVersion: NonNegativeInt,
    emittedAt: IsoDateTime,
    reason: TrimmedNonEmptyString,
  }),
  Schema.Struct({
    type: Schema.Literal("nitromap.discontinuity"),
    environmentId: EnvironmentId,
    projectId: ProjectId,
    sequence: NonNegativeInt,
    projectVersion: NonNegativeInt,
    emittedAt: IsoDateTime,
    reason: TrimmedNonEmptyString,
    snapshot: NitroMapSnapshot,
  }),
]);

export const NitroMapSubscriptionEvent = NitroMapSubscriptionEventShape.check(
  Schema.makeFilter((event) => {
    if (event.type === "nitromap.stale") return true;
    return (
      (event.environmentId === event.snapshot.environmentId &&
        event.projectId === event.snapshot.projectId &&
        event.projectVersion === event.snapshot.version) ||
      "Snapshot event metadata must match the embedded snapshot"
    );
  }),
);
export type NitroMapSubscriptionEvent = typeof NitroMapSubscriptionEvent.Type;
