import type {
  NitroMapReconciliationAction,
  NitroOwnershipAgent,
  NitroOwnershipEdge,
  NitroOwnershipTrace,
  NitroProjectMap,
  NitroResource,
  NitroResponsibility,
  NitroSelectionTarget,
  NitroSupervisionEdge,
  NitroWorkEpisodeSummary,
} from "./types";

export type NitroInspection =
  | { kind: "agent"; agent: NitroOwnershipAgent; supervisedAgents: NitroOwnershipAgent[] }
  | { kind: "resource"; resource: NitroResource; responsibilities: NitroResponsibility[] }
  | {
      kind: "responsibility";
      responsibility: NitroResponsibility;
      agent: NitroOwnershipAgent | null;
      resource: NitroResource | null;
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
  | { kind: "work-episode"; episode: NitroWorkEpisodeSummary; traces: NitroOwnershipTrace[] }
  | {
      kind: "trace";
      trace: NitroOwnershipTrace;
      episode: NitroWorkEpisodeSummary | null;
      agent: NitroOwnershipAgent | null;
    }
  | { kind: "intervention"; intervention: NitroProjectMap["interventions"][number] }
  | { kind: "reconciliation-action"; action: NitroMapReconciliationAction };

export interface NitroMapCounts {
  agentCount: number;
  implementationAgentCount: number;
  managementAgentCount: number;
  resourceCount: number;
  runningWorkEpisodeCount: number;
  pendingTraceCount: number;
  openInterventionCount: number;
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
    pendingTraceCount: map.traces.filter((trace) => trace.status === "pending").length,
    openInterventionCount: map.interventions.filter(
      (intervention) => intervention.status === "open",
    ).length,
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
        responsibilities: map.responsibilities.filter(
          (responsibility) => responsibility.resourceId === resource.id,
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
        resource:
          map.resources.find((resource) => resource.id === responsibility.resourceId) ?? null,
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
        traces: map.traces.filter((trace) => trace.episodeId === episode.id),
      };
    }
    case "trace": {
      const trace = map.traces.find((entry) => entry.id === selection.id);
      if (!trace) return null;
      return {
        kind: "trace",
        trace,
        agent: map.agents.find((agent) => agent.id === trace.agentId) ?? null,
        episode: map.workEpisodes.find((episode) => episode.id === trace.episodeId) ?? null,
      };
    }
    case "intervention": {
      const intervention = map.interventions.find((entry) => entry.id === selection.id);
      return intervention ? { kind: "intervention", intervention } : null;
    }
    case "reconciliation-action": {
      const action = map.maintenance.actions.find((entry) => entry.id === selection.id);
      return action ? { kind: "reconciliation-action", action } : null;
    }
  }
}

export function isNitroSelectionEqual(
  left: NitroSelectionTarget | null,
  right: NitroSelectionTarget | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.kind === right.kind && left.id === right.id;
}
