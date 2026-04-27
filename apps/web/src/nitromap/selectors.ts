import type {
  NitroAgentInvocation,
  NitroIntervention,
  NitroMapReconciliationAction,
  NitroMapMaintenanceSummary,
  NitroOwnershipAgent,
  NitroOwnershipEdge,
  NitroProjectMap,
  NitroRoundTrace,
  NitroResource,
  NitroResponsibility,
  NitroSelectionTarget,
  NitroSupervisionEdge,
  NitroWorkEpisodeSummary,
  NitroWorkRoundSummary,
} from "./types";

export type NitroInspection =
  | { kind: "agent"; agent: NitroOwnershipAgent; supervisedAgents: NitroOwnershipAgent[] }
  | { kind: "resource"; resource: NitroResource; responsibilities: NitroResponsibility[] }
  | {
      kind: "responsibility";
      responsibility: NitroResponsibility;
      agent: NitroOwnershipAgent | null;
      resources: NitroResource[];
    }
  | {
      kind: "supervision-edge";
      edge: NitroSupervisionEdge;
      parent: NitroOwnershipAgent | null;
      child: NitroOwnershipAgent | null;
    }
  | {
      kind: "ownership-edge";
      edge: NitroOwnershipEdge;
      responsibility: NitroResponsibility | null;
      agent: NitroOwnershipAgent | null;
      resource: NitroResource | null;
    }
  | { kind: "work-episode"; episode: NitroWorkEpisodeSummary; rounds: NitroWorkRoundSummary[] }
  | {
      kind: "work-round";
      episode: NitroWorkEpisodeSummary | null;
      round: NitroWorkRoundSummary;
    }
  | {
      kind: "round-trace";
      trace: NitroRoundTrace;
      round: NitroWorkRoundSummary | null;
      episode: NitroWorkEpisodeSummary | null;
      invocations: NitroAgentInvocation[];
    }
  | {
      kind: "agent-invocation";
      invocation: NitroAgentInvocation;
      agent: NitroOwnershipAgent | null;
      round: NitroWorkRoundSummary | null;
      trace: NitroRoundTrace | null;
    }
  | {
      kind: "intervention";
      intervention: NitroIntervention;
      episode: NitroWorkEpisodeSummary | null;
      round: NitroWorkRoundSummary | null;
      resources: NitroResource[];
      responsibilities: NitroResponsibility[];
    }
  | { kind: "reconciliation-action"; action: NitroMapReconciliationAction };

export interface NitroMapCounts {
  agentCount: number;
  implementationAgentCount: number;
  managementAgentCount: number;
  resourceCount: number;
  runningWorkEpisodeCount: number;
  pendingTraceCount: number;
  proposedMaintenanceActionCount: number;
}

export function selectNitroMapCounts(map: NitroProjectMap): NitroMapCounts {
  return {
    agentCount: map.agents.length,
    implementationAgentCount: map.agents.filter((agent) => agent.kind === "implementation").length,
    managementAgentCount: map.agents.filter((agent) => agent.kind === "management").length,
    resourceCount: map.resources.length,
    runningWorkEpisodeCount: map.workEpisodes.filter((episode) => episode.status === "running")
      .length,
    pendingTraceCount: map.workEpisodes
      .flatMap((episode) => episode.rounds)
      .flatMap((round) => round.traces)
      .filter((trace) => trace.status === "pending").length,
    proposedMaintenanceActionCount: map.maintenance.actions.filter(
      (action) => action.status === "proposed",
    ).length,
  };
}

export function selectForegroundWorkEpisode(map: NitroProjectMap): NitroWorkEpisodeSummary | null {
  return (
    map.workEpisodes
      .filter((episode) => episode.status === "running")
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
    map.workEpisodes.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
    null
  );
}

export function selectInitialNitroSelection(map: NitroProjectMap): NitroSelectionTarget | null {
  const foregroundEpisode = selectForegroundWorkEpisode(map);
  if (foregroundEpisode) {
    return {
      kind: "work-episode",
      id: foregroundEpisode.id,
    };
  }

  const managementAgent = map.agents.find((agent) => agent.kind === "management") ?? map.agents[0];
  return managementAgent ? { kind: "agent", id: managementAgent.id } : null;
}

export function selectNitroSelectionAfterMapUpdate(input: {
  readonly map: NitroProjectMap;
  readonly currentSelection: NitroSelectionTarget | null;
  readonly routeEpisodeId?: string | undefined;
  readonly forceRouteEpisodeSelection?: boolean | undefined;
}): NitroSelectionTarget | null {
  const routeEpisodeSelection =
    input.routeEpisodeId &&
    input.map.workEpisodes.some((episode) => episode.id === input.routeEpisodeId)
      ? ({ kind: "work-episode", id: input.routeEpisodeId } as const)
      : null;
  if (input.forceRouteEpisodeSelection && routeEpisodeSelection) return routeEpisodeSelection;
  if (
    input.currentSelection &&
    selectNitroMapInspection(input.map, input.currentSelection) !== null
  ) {
    return input.currentSelection;
  }
  return routeEpisodeSelection ?? selectInitialNitroSelection(input.map);
}

export function selectNitroMapMaintenanceNotice(
  maintenance: NitroMapMaintenanceSummary,
): string | null {
  switch (maintenance.cartographerStatus) {
    case "ready":
      return null;
    case "not-run":
      return "Cartographer not run";
    case "running":
      return "Cartographer running";
    case "failed":
      return "Cartographer failed";
  }
}

export function selectNitroMapInspection(
  map: NitroProjectMap,
  selection: NitroSelectionTarget | null,
): NitroInspection | null {
  if (!selection) return null;

  switch (selection.kind) {
    case "agent": {
      const agent = map.agents.find((entry) => entry.id === selection.id);
      if (!agent) return null;
      const supervisedAgentIds = new Set(
        map.supervisionEdges
          .filter((edge) => edge.parentAgentId === agent.id)
          .map((edge) => edge.childAgentId),
      );
      return {
        kind: "agent",
        agent,
        supervisedAgents: map.agents.filter((entry) => supervisedAgentIds.has(entry.id)),
      };
    }
    case "resource": {
      const resource = map.resources.find((entry) => entry.id === selection.id);
      if (!resource) return null;
      return {
        kind: "resource",
        resource,
        responsibilities: map.responsibilities.filter((responsibility) =>
          responsibility.resourceIds.includes(resource.id),
        ),
      };
    }
    case "responsibility": {
      const responsibility = map.responsibilities.find((entry) => entry.id === selection.id);
      if (!responsibility) return null;
      return {
        kind: "responsibility",
        responsibility,
        agent: map.agents.find((agent) => agent.id === responsibility.agentId) ?? null,
        resources: map.resources.filter((resource) =>
          responsibility.resourceIds.includes(resource.id),
        ),
      };
    }
    case "supervision-edge": {
      const edge = map.supervisionEdges.find((entry) => entry.id === selection.id);
      if (!edge) return null;
      return {
        kind: "supervision-edge",
        edge,
        parent: map.agents.find((agent) => agent.id === edge.parentAgentId) ?? null,
        child: map.agents.find((agent) => agent.id === edge.childAgentId) ?? null,
      };
    }
    case "ownership-edge": {
      const edge = map.ownershipEdges.find((entry) => entry.id === selection.id);
      if (!edge) return null;
      return {
        kind: "ownership-edge",
        edge,
        responsibility:
          map.responsibilities.find(
            (responsibility) => responsibility.id === edge.responsibilityId,
          ) ?? null,
        agent: map.agents.find((agent) => agent.id === edge.agentId) ?? null,
        resource: map.resources.find((resource) => resource.id === edge.resourceId) ?? null,
      };
    }
    case "work-episode": {
      const episode = map.workEpisodes.find((entry) => entry.id === selection.id);
      if (!episode) return null;
      return {
        kind: "work-episode",
        episode,
        rounds: episode.rounds,
      };
    }
    case "work-round": {
      const match = findRoundContext(map, selection.id);
      if (!match) return null;
      return {
        kind: "work-round",
        episode: match.episode,
        round: match.round,
      };
    }
    case "round-trace": {
      const match = findTraceContext(map, selection.id);
      if (!match) return null;
      return {
        kind: "round-trace",
        episode: match.episode,
        round: match.round,
        trace: match.trace,
        invocations: match.round.invocations.filter((invocation) =>
          match.trace.invocationIds.includes(invocation.id),
        ),
      };
    }
    case "agent-invocation": {
      const match = findInvocationContext(map, selection.id);
      if (!match) return null;
      return {
        kind: "agent-invocation",
        invocation: match.invocation,
        agent: map.agents.find((agent) => agent.id === match.invocation.agentId) ?? null,
        round: match.round,
        trace: match.trace,
      };
    }
    case "intervention": {
      const intervention = map.interventions.find((entry) => entry.id === selection.id);
      if (!intervention) return null;
      return {
        kind: "intervention",
        intervention,
        episode: intervention.episodeId
          ? (map.workEpisodes.find((episode) => episode.id === intervention.episodeId) ?? null)
          : null,
        round: intervention.roundId
          ? (findRoundContext(map, intervention.roundId)?.round ?? null)
          : null,
        resources: map.resources.filter((resource) =>
          intervention.relatedResourceIds.includes(resource.id),
        ),
        responsibilities: map.responsibilities.filter((responsibility) =>
          intervention.relatedResponsibilityIds.includes(responsibility.id),
        ),
      };
    }
    case "reconciliation-action": {
      const action = map.maintenance.actions.find((entry) => entry.id === selection.id);
      return action ? { kind: "reconciliation-action", action } : null;
    }
  }
}

function findRoundContext(
  map: NitroProjectMap,
  roundId: string,
): { episode: NitroWorkEpisodeSummary; round: NitroWorkRoundSummary } | null {
  for (const episode of map.workEpisodes) {
    const round = episode.rounds.find((entry) => entry.id === roundId);
    if (round) {
      return { episode, round };
    }
  }
  return null;
}

function findTraceContext(
  map: NitroProjectMap,
  traceId: string,
): {
  episode: NitroWorkEpisodeSummary;
  round: NitroWorkRoundSummary;
  trace: NitroRoundTrace;
} | null {
  for (const episode of map.workEpisodes) {
    for (const round of episode.rounds) {
      const trace = round.traces.find((entry) => entry.id === traceId);
      if (trace) {
        return { episode, round, trace };
      }
    }
  }
  return null;
}

function findInvocationContext(
  map: NitroProjectMap,
  invocationId: string,
): {
  episode: NitroWorkEpisodeSummary;
  round: NitroWorkRoundSummary;
  trace: NitroRoundTrace | null;
  invocation: NitroAgentInvocation;
} | null {
  for (const episode of map.workEpisodes) {
    for (const round of episode.rounds) {
      const invocation = round.invocations.find((entry) => entry.id === invocationId);
      if (invocation) {
        return {
          episode,
          round,
          invocation,
          trace: round.traces.find((trace) => trace.id === invocation.traceId) ?? null,
        };
      }
    }
  }
  return null;
}

export function isNitroSelectionEqual(
  left: NitroSelectionTarget | null,
  right: NitroSelectionTarget | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.kind === right.kind && left.id === right.id;
}
