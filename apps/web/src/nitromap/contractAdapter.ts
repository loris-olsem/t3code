import type { NitroMapProjectSnapshot } from "@nitrocode/contracts";
import type {
  NitroAgentStatus,
  NitroMapReconciliationAction,
  NitroProjectMap,
  NitroResourceKind,
  NitroWorkEpisodeSummary,
} from "./types";

const FALLBACK_NITROMAP_GENERATED_AT = "2026-04-25T00:00:00.000Z";

type ContractResourceKind =
  | "file"
  | "folder"
  | "generated-asset"
  | "remote-resource"
  | "logical-component";

function toContractResourceKind(kind: NitroResourceKind): ContractResourceKind {
  switch (kind) {
    case "directory":
      return "folder";
    case "service":
    case "concept":
      return "logical-component";
    default:
      return kind;
  }
}

function toContractAgentStatus(status: NitroAgentStatus) {
  return status;
}

function toContractEpisodeStatus(status: NitroWorkEpisodeSummary["status"]) {
  return status === "waiting" ? "blocked" : status;
}

function toContractMainAgentStatus(status: NitroWorkEpisodeSummary["mainAgent"]["status"]) {
  switch (status) {
    case "working":
      return "running";
    case "waiting":
      return "waiting-for-ownership";
    default:
      return status;
  }
}

function fromContractResourceKind(kind: ContractResourceKind): NitroResourceKind {
  switch (kind) {
    case "folder":
      return "directory";
    default:
      return kind;
  }
}

function fromContractResponsibilityQuery(
  query: NitroMapProjectSnapshot["responsibilities"][number]["query"],
) {
  switch (query.kind) {
    case "derived":
      return {
        label: query.description,
        definition: {
          kind: "derived" as const,
          source: query.source,
          description: query.description,
        },
        rationale: query.description,
      };
    case "path-glob":
      return {
        label: query.patterns.join(", "),
        definition: {
          kind: query.kind,
          patterns: Array.from(query.patterns),
        },
        rationale: "Projected from the NitroMap responsibility query.",
      };
    case "path-set":
      return {
        label: query.paths.join(", "),
        definition: {
          kind: query.kind,
          paths: Array.from(query.paths),
        },
        rationale: "Projected from the NitroMap responsibility query.",
      };
    case "event-query":
      return {
        label: query.eventKinds.join(", "),
        definition: {
          kind: "event-query" as const,
          eventKinds: Array.from(query.eventKinds),
          ...(query.resourceLocator ? { resourceLocator: query.resourceLocator } : {}),
        },
        rationale: query.resourceLocator ?? query.eventKinds.join(", "),
      };
  }
}

function fromContractEpisodeStatus(
  status: NitroMapProjectSnapshot["workEpisodes"][number]["status"],
) {
  return status;
}

function fromContractMainAgentStatus(
  status: NitroMapProjectSnapshot["workEpisodes"][number]["mainAgent"]["status"],
) {
  switch (status) {
    case "running":
      return "working";
    case "waiting-for-ownership":
    case "waiting-for-user":
      return "waiting";
    default:
      return status;
  }
}

function toContractResponsibilityQuery(
  responsibility: NitroProjectMap["responsibilities"][number],
) {
  const { definition } = responsibility.query;

  switch (definition.kind) {
    case "concept":
      return {
        kind: "derived",
        source: "mock",
        description: definition.key,
      };
    case "derived":
      return definition;
    case "event-query":
      return definition;
    default:
      return definition;
  }
}

function toContractReconciliationAction(
  map: NitroProjectMap,
  action: NitroMapReconciliationAction,
) {
  const common = {
    actionId: action.id,
    status: action.status,
    title: action.title,
    reason: action.reason,
    createdAt: map.maintenance.lastCheckedAt ?? FALLBACK_NITROMAP_GENERATED_AT,
    appliedAt: null,
  };

  switch (action.actionKind) {
    case "update-responsibility": {
      const responsibility = map.responsibilities.find((entry) => entry.id === action.targetId);
      if (!responsibility) {
        throw new Error(`NitroMap mock action target not found: ${action.targetId}`);
      }
      if (!action.proposedResponsibilityStatus) {
        throw new Error(`NitroMap mock update action is missing a proposed status: ${action.id}`);
      }
      const contractResponsibility = {
        responsibilityId: responsibility.id,
        agentId: responsibility.agentId,
        label: responsibility.label,
        status: responsibility.status,
        query: toContractResponsibilityQuery(responsibility),
        rationale: responsibility.query.rationale,
      };
      const nextResponsibility = {
        ...contractResponsibility,
        status: action.proposedResponsibilityStatus,
      };

      return {
        ...common,
        actionKind: action.actionKind,
        targetKind: "responsibility",
        targetId: action.targetId,
        changes: [
          {
            targetKind: "responsibility",
            targetId: action.targetId,
            before: contractResponsibility,
            after: nextResponsibility,
          },
        ],
      };
    }
    default:
      throw new Error(`Unsupported mock NitroMap reconciliation action: ${action.actionKind}`);
  }
}

export function toNitroMapSnapshot(map: NitroProjectMap) {
  return {
    environmentId: map.project.environmentId,
    projectId: map.project.projectId,
    projectName: map.project.name,
    version: 1,
    generatedAt: map.maintenance.lastCheckedAt ?? FALLBACK_NITROMAP_GENERATED_AT,
    resources: map.resources.map((resource) => ({
      resourceId: resource.id,
      label: resource.label,
      kind: toContractResourceKind(resource.kind),
      locator: resource.path,
      position: resource.position,
    })),
    agents: map.agents.map((agent) => ({
      agentId: agent.id,
      label: agent.label,
      kind: agent.kind,
      purpose: agent.purpose,
      status: toContractAgentStatus(agent.status),
      position: agent.position,
    })),
    responsibilities: map.responsibilities.map((responsibility) => ({
      responsibilityId: responsibility.id,
      agentId: responsibility.agentId,
      label: responsibility.label,
      status: responsibility.status,
      query: toContractResponsibilityQuery(responsibility),
      rationale: responsibility.query.rationale,
    })),
    ownershipEdges: map.ownershipEdges.map((edge) => ({
      edgeId: edge.id,
      responsibilityId: edge.responsibilityId,
      agentId: edge.agentId,
      resourceId: edge.resourceId,
    })),
    supervisionEdges: map.supervisionEdges.map((edge) => ({
      edgeId: edge.id,
      supervisingAgentId: edge.parentAgentId,
      supervisedAgentId: edge.childAgentId,
    })),
    interventions: map.interventions.map((intervention) => ({
      interventionId: intervention.id,
      status: intervention.status,
      severity: intervention.severity,
      title: intervention.title,
      summary: intervention.summary,
      source: intervention.source,
      episodeId: intervention.episodeId,
      roundId: intervention.roundId,
      relatedResourceIds: intervention.relatedResourceIds,
      relatedResponsibilityIds: Array.from(intervention.relatedResponsibilityIds),
      createdAt: intervention.createdAt,
      resolvedAt: intervention.resolvedAt,
    })),
    workEpisodes: map.workEpisodes.map((episode) => ({
      episodeId: episode.id,
      environmentId: episode.environmentId,
      projectId: episode.projectId,
      conversationThreadId: episode.conversationThreadId,
      startedFromMessageId: episode.startedFromMessageId,
      backingThreadId: episode.backingThreadId,
      transcriptRoute: episode.transcriptRoute,
      title: episode.title,
      status: toContractEpisodeStatus(episode.status),
      mainAgent: {
        mainAgentId: `${episode.id}:main-agent`,
        label: episode.mainAgent.label,
        status: toContractMainAgentStatus(episode.mainAgent.status),
      },
      latestUserMessage: episode.latestUserMessage,
      blockingItems: episode.blockingItems.map((item) => ({
        blockingItemId: item.id,
        kind: item.kind,
        severity: item.severity,
        label: item.label,
        sourceEventId: item.sourceEventId,
        primaryAction: item.primaryAction,
        secondaryActions: Array.from(item.secondaryActions),
      })),
      rounds: episode.rounds.map((round) => ({
        roundId: round.id,
        episodeId: round.episodeId,
        index: round.index,
        title: round.title,
        status: round.status,
        startedByMessageId: round.startedByMessageId,
        startedByUserMessage: round.startedByUserMessage,
        resultMessageId: round.resultMessageId,
        startedAt: round.startedAt,
        completedAt: round.completedAt,
        traces: round.traces.map((trace) => ({
          traceId: trace.id,
          roundId: trace.roundId,
          status: trace.status,
          title: trace.title,
          summary: trace.summary,
          rootInvocationId: trace.rootInvocationId,
          invocationIds: Array.from(trace.invocationIds),
          insertedAt: trace.insertedAt,
        })),
        invocations: round.invocations.map((invocation) => ({
          invocationId: invocation.id,
          roundId: invocation.roundId,
          traceId: invocation.traceId,
          agentId: invocation.agentId,
          parentInvocationId: invocation.parentInvocationId,
          trigger: invocation.trigger,
          status: invocation.status,
          summary: invocation.summary,
          startedAt: invocation.startedAt,
          completedAt: invocation.completedAt,
          position: invocation.position,
        })),
      })),
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
    })),
    mapMaintenance: {
      cartographerStatus: map.maintenance.cartographerStatus,
      lastCheckedAt: map.maintenance.lastCheckedAt,
      actions: map.maintenance.actions.map((action) => toContractReconciliationAction(map, action)),
    },
  };
}

export function fromNitroMapSnapshot(snapshot: NitroMapProjectSnapshot): NitroProjectMap {
  const ownershipEdgesByResponsibilityId = new Map<
    NitroMapProjectSnapshot["responsibilities"][number]["responsibilityId"],
    NitroMapProjectSnapshot["ownershipEdges"]
  >();
  for (const edge of snapshot.ownershipEdges) {
    ownershipEdgesByResponsibilityId.set(edge.responsibilityId, [
      ...(ownershipEdgesByResponsibilityId.get(edge.responsibilityId) ?? []),
      edge,
    ]);
  }

  return {
    project: {
      environmentId: snapshot.environmentId,
      projectId: snapshot.projectId,
      name: snapshot.projectName,
    },
    resources: snapshot.resources.map((resource) => ({
      id: resource.resourceId,
      label: resource.label,
      kind: fromContractResourceKind(resource.kind),
      path: resource.locator,
      position:
        resource.position ??
        (() => {
          throw new Error(`NitroMap projection resource has no position: ${resource.resourceId}`);
        })(),
    })),
    agents: snapshot.agents.map((agent) => ({
      id: agent.agentId,
      label: agent.label,
      kind: agent.kind,
      purpose: agent.purpose,
      status: agent.status,
      position:
        agent.position ??
        (() => {
          throw new Error(`NitroMap projection agent has no position: ${agent.agentId}`);
        })(),
    })),
    responsibilities: snapshot.responsibilities.map((responsibility) => {
      const ownershipEdges = ownershipEdgesByResponsibilityId.get(responsibility.responsibilityId);
      if (!ownershipEdges || ownershipEdges.length < 1) {
        throw new Error(
          `NitroMap projection responsibility must have at least one UI ownership edge: ${responsibility.responsibilityId}`,
        );
      }
      const query = fromContractResponsibilityQuery(responsibility.query);
      return {
        id: responsibility.responsibilityId,
        agentId: responsibility.agentId,
        resourceIds: ownershipEdges.map((edge) => edge.resourceId),
        label: responsibility.label,
        status: responsibility.status,
        query: {
          ...query,
          rationale: responsibility.rationale,
        },
      };
    }),
    ownershipEdges: snapshot.ownershipEdges.map((edge) => ({
      id: edge.edgeId,
      responsibilityId: edge.responsibilityId,
      agentId: edge.agentId,
      resourceId: edge.resourceId,
    })),
    supervisionEdges: snapshot.supervisionEdges.map((edge) => ({
      id: edge.edgeId,
      parentAgentId: edge.supervisingAgentId,
      childAgentId: edge.supervisedAgentId,
    })),
    interventions: snapshot.interventions.map((intervention) => ({
      id: intervention.interventionId,
      status: intervention.status,
      severity: intervention.severity,
      title: intervention.title,
      summary: intervention.summary,
      source: intervention.source,
      episodeId: intervention.episodeId,
      roundId: intervention.roundId,
      relatedResourceIds: Array.from(intervention.relatedResourceIds),
      relatedResponsibilityIds: Array.from(intervention.relatedResponsibilityIds),
      createdAt: intervention.createdAt,
      resolvedAt: intervention.resolvedAt,
    })),
    workEpisodes: snapshot.workEpisodes.map((episode) => ({
      id: episode.episodeId,
      environmentId: episode.environmentId,
      projectId: episode.projectId,
      conversationThreadId: episode.conversationThreadId,
      startedFromMessageId: episode.startedFromMessageId,
      mainAgent: {
        label: episode.mainAgent.label,
        status: fromContractMainAgentStatus(episode.mainAgent.status),
      },
      title: episode.title,
      status: fromContractEpisodeStatus(episode.status),
      backingThreadId: episode.backingThreadId,
      transcriptRoute: episode.transcriptRoute,
      latestUserMessage: episode.latestUserMessage,
      blockingItems: episode.blockingItems.map((item) => ({
        id: item.blockingItemId,
        kind: item.kind,
        severity: item.severity,
        label: item.label,
        sourceEventId: item.sourceEventId,
        primaryAction: item.primaryAction,
        secondaryActions: Array.from(item.secondaryActions),
      })),
      rounds: episode.rounds.map((round) => ({
        id: round.roundId,
        episodeId: round.episodeId,
        index: round.index,
        title: round.title,
        status: round.status,
        startedByMessageId: round.startedByMessageId,
        startedByUserMessage: round.startedByUserMessage,
        resultMessageId: round.resultMessageId,
        startedAt: round.startedAt,
        completedAt: round.completedAt,
        traces: round.traces.map((trace) => ({
          id: trace.traceId,
          roundId: trace.roundId,
          status: trace.status,
          title: trace.title,
          summary: trace.summary,
          rootInvocationId: trace.rootInvocationId,
          invocationIds: Array.from(trace.invocationIds),
          insertedAt: trace.insertedAt,
        })),
        invocations: round.invocations.map((invocation) => ({
          id: invocation.invocationId,
          roundId: invocation.roundId,
          traceId: invocation.traceId,
          agentId: invocation.agentId,
          parentInvocationId: invocation.parentInvocationId,
          trigger: invocation.trigger,
          status: invocation.status,
          summary: invocation.summary,
          startedAt: invocation.startedAt,
          completedAt: invocation.completedAt,
          position:
            invocation.position ??
            (() => {
              throw new Error(
                `NitroMap projection invocation has no position: ${invocation.invocationId}`,
              );
            })(),
        })),
      })),
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
    })),
    maintenance: {
      cartographerLabel: "Cartographer",
      cartographerStatus: snapshot.mapMaintenance.cartographerStatus,
      lastCheckedAt: snapshot.mapMaintenance.lastCheckedAt,
      actions: snapshot.mapMaintenance.actions.map((action) => {
        if (action.actionKind === "update-responsibility") {
          const proposedResponsibilityStatus = action.changes[0]?.after?.status;
          if (!proposedResponsibilityStatus) {
            throw new Error(
              `NitroMap projection action has no proposed responsibility status: ${action.actionId}`,
            );
          }
          return {
            id: action.actionId,
            actionKind: action.actionKind,
            status: action.status,
            title: action.title,
            reason: action.reason,
            targetId: action.targetId,
            targetKind: action.targetKind,
            proposedResponsibilityStatus,
          };
        }
        return {
          id: action.actionId,
          actionKind: action.actionKind,
          status: action.status,
          title: action.title,
          reason: action.reason,
          targetId: action.targetId,
          targetKind: action.targetKind,
        };
      }),
    },
  };
}
