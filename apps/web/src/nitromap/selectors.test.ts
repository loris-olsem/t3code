import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { NitroMapSnapshot } from "@nitrocode/contracts";

import { fromNitroMapSnapshot, toNitroMapSnapshot } from "./contractAdapter";
import { buildMockNitroProjectMap, buildMockNitroRouteParams } from "./mockData";
import {
  selectForegroundWorkEpisode,
  selectInitialNitroSelection,
  selectNitroMapCounts,
  selectNitroMapInspection,
  selectNitroMapMaintenanceNotice,
  selectNitroSelectionAfterMapUpdate,
} from "./selectors";

const map = buildMockNitroProjectMap(
  buildMockNitroRouteParams({
    environmentId: "env-test",
    projectId: "project-test",
  }),
);

describe("nitromap selectors", () => {
  it("keeps mock NitroMap data encodable as the shared contract snapshot", () => {
    const snapshot = Schema.decodeUnknownSync(NitroMapSnapshot)(toNitroMapSnapshot(map));

    expect(snapshot.interventions).toHaveLength(1);
    expect(snapshot.interventions[0]?.relatedResourceIds).toEqual([
      expect.stringContaining("resource-traces"),
    ]);
    expect(snapshot.mapMaintenance.actions[0]?.actionKind).toBe("update-responsibility");
    expect(snapshot.mapMaintenance.actions[0]?.appliedAt).toBeNull();
    expect(snapshot.workEpisodes[0]?.rounds[0]?.startedByMessageId).toEqual(
      expect.stringContaining("message-active-start"),
    );
  });

  it("encodes aborting main-agent status at the shared contract boundary", () => {
    const snapshot = Schema.decodeUnknownSync(NitroMapSnapshot)(
      toNitroMapSnapshot({
        ...map,
        workEpisodes: [
          {
            ...map.workEpisodes[0]!,
            mainAgent: {
              ...map.workEpisodes[0]!.mainAgent,
              status: "aborting",
            },
          },
        ],
      }),
    );

    expect(snapshot.workEpisodes[0]?.mainAgent.status).toBe("aborting");
  });

  it("converts backend NitroMap snapshots into the UI map model", () => {
    const snapshot = Schema.decodeUnknownSync(NitroMapSnapshot)(toNitroMapSnapshot(map));
    const projectedMap = fromNitroMapSnapshot(snapshot);

    expect(projectedMap.project).toEqual(map.project);
    expect(projectedMap.agents).toHaveLength(map.agents.length);
    expect(projectedMap.responsibilities[0]?.resourceIds).toEqual(
      map.responsibilities[0]?.resourceIds,
    );
    expect(projectedMap.workEpisodes[0]?.rounds[0]?.traces[0]?.rootInvocationId).toBe(
      map.workEpisodes[0]?.rounds[0]?.traces[0]?.rootInvocationId,
    );
  });

  it("converts backend snapshots with multi-resource responsibilities", () => {
    const snapshot = Schema.decodeUnknownSync(NitroMapSnapshot)(toNitroMapSnapshot(map));
    const duplicateEdge = {
      ...snapshot.ownershipEdges[0]!,
      edgeId: `${snapshot.ownershipEdges[0]!.edgeId}:duplicate`,
      resourceId: snapshot.ownershipEdges[1]!.resourceId,
    };

    const projectedMap = fromNitroMapSnapshot(
      Schema.decodeUnknownSync(NitroMapSnapshot)({
        ...snapshot,
        ownershipEdges: [...snapshot.ownershipEdges, duplicateEdge],
      }),
    );

    expect(projectedMap.responsibilities[0]?.resourceIds).toEqual([
      snapshot.ownershipEdges[0]?.resourceId,
      snapshot.ownershipEdges[1]?.resourceId,
    ]);
  });

  it("summarizes ownership map counts", () => {
    expect(selectNitroMapCounts(map)).toMatchObject({
      agentCount: 5,
      implementationAgentCount: 2,
      managementAgentCount: 3,
      resourceCount: 4,
      runningWorkEpisodeCount: 1,
      pendingTraceCount: 1,
      proposedMaintenanceActionCount: 1,
    });
  });

  it("uses running work as the foreground selection", () => {
    const foreground = selectForegroundWorkEpisode(map);

    expect(foreground?.status).toBe("running");
    expect(selectInitialNitroSelection(map)).toEqual({
      kind: "work-episode",
      id: foreground?.id,
    });
  });

  it("shows that one management agent can supervise multiple agents", () => {
    const projectManager = map.agents.find((agent) => agent.label === "Project manager");
    const inspection = selectNitroMapInspection(
      map,
      projectManager ? { kind: "agent", id: projectManager.id } : null,
    );

    expect(inspection?.kind).toBe("agent");
    if (inspection?.kind !== "agent") return;
    expect(inspection.supervisedAgents.map((agent) => agent.kind).toSorted()).toEqual([
      "management",
      "management",
    ]);
  });

  it("resolves a responsibility to both the watching agent and resources", () => {
    const watchedResponsibility = map.responsibilities.find(
      (responsibility) => responsibility.status === "watched",
    );
    const inspection = selectNitroMapInspection(
      map,
      watchedResponsibility ? { kind: "responsibility", id: watchedResponsibility.id } : null,
    );

    expect(inspection?.kind).toBe("responsibility");
    if (inspection?.kind !== "responsibility") return;
    expect(inspection.agent?.kind).toBe("implementation");
    expect(inspection.resources[0]?.path.length).toBeGreaterThan(0);
    expect(inspection.responsibility.query.definition.kind).toBe("path-glob");
    if (inspection.responsibility.query.definition.kind !== "path-glob") return;
    expect(inspection.responsibility.query.definition.patterns.length).toBeGreaterThan(0);
  });

  it("models blocked work with disabled action metadata", () => {
    const blockedEpisode = map.workEpisodes.find((episode) => episode.status === "blocked");

    expect(blockedEpisode?.blockingItems[0]).toMatchObject({
      kind: "approval",
      severity: "blocking",
      primaryAction: {
        kind: "decide-approval",
        disabled: true,
      },
    });
  });

  it("models failed provider turns with retry and failure-detail actions", () => {
    const failedEpisode = map.workEpisodes.find((episode) => episode.status === "failed");

    expect(failedEpisode?.mainAgent.status).toBe("failed");
    expect(failedEpisode?.blockingItems[0]).toMatchObject({
      kind: "failed-turn",
      severity: "blocking",
      primaryAction: {
        kind: "retry-turn",
        disabled: true,
      },
    });
    expect(failedEpisode?.blockingItems[0]?.secondaryActions.map((action) => action.kind)).toEqual([
      "open-transcript",
      "open-failure-detail",
    ]);
  });

  it("models episode rounds with concrete agent invocation graphs", () => {
    const episode = map.workEpisodes.find((entry) => entry.status === "running");
    const runningRound = episode?.rounds.find((round) => round.status === "running");

    expect(runningRound?.traces[0]).toMatchObject({
      status: "pending",
      invocationIds: expect.arrayContaining([expect.stringContaining("invocation-runtime")]),
    });
    expect(runningRound?.invocations.some((invocation) => invocation.parentInvocationId)).toBe(
      true,
    );
  });

  it("inspects a concrete invocation with its round and trace context", () => {
    const invocation = map.workEpisodes[0]?.rounds[0]?.invocations[0];
    const inspection = selectNitroMapInspection(
      map,
      invocation ? { kind: "agent-invocation", id: invocation.id } : null,
    );

    expect(inspection?.kind).toBe("agent-invocation");
    if (inspection?.kind !== "agent-invocation") return;
    expect(inspection.agent?.kind).toBe("implementation");
    expect(inspection.round?.index).toBe(1);
    expect(inspection.trace?.status).toBe("injected");
  });

  it("keeps Cartographer and user-facing main agents outside the ownership-agent graph", () => {
    expect(map.agents.some((agent) => agent.label === map.maintenance.cartographerLabel)).toBe(
      false,
    );
    expect(map.agents.some((agent) => agent.label === "Conversation main agent")).toBe(false);
    expect(map.workEpisodes[0]?.mainAgent.label).toBe("Conversation main agent");
    expect(map.workEpisodes[0]?.rounds.length).toBeGreaterThan(0);

    const actionInspection = selectNitroMapInspection(map, {
      kind: "reconciliation-action",
      id: map.maintenance.actions[0]!.id,
    });
    expect(actionInspection?.kind).toBe("reconciliation-action");
  });

  it("selects interventions for inspection from map maintenance", () => {
    const intervention = map.interventions[0];
    const inspection = selectNitroMapInspection(
      map,
      intervention ? { kind: "intervention", id: intervention.id } : null,
    );

    expect(inspection?.kind).toBe("intervention");
    if (inspection?.kind !== "intervention") return;
    expect(inspection.resources[0]?.id).toContain("resource-traces");
    expect(inspection.responsibilities[0]?.id).toContain("responsibility-traces");
  });

  it("chooses the newest running episode regardless of array order", () => {
    const olderRunning = {
      ...map.workEpisodes[0]!,
      id: "older-running",
      updatedAt: "2026-04-25T09:00:00.000Z",
    };
    const newerRunning = {
      ...map.workEpisodes[0]!,
      id: "newer-running",
      updatedAt: "2026-04-25T10:00:00.000Z",
    };
    const reorderedMap = {
      ...map,
      workEpisodes: [olderRunning, map.workEpisodes[1]!, newerRunning],
    };

    expect(selectForegroundWorkEpisode(reorderedMap)?.id).toBe("newer-running");
  });

  it("preserves a valid user selection across map refreshes", () => {
    const resource = map.resources[0]!;
    const selection = { kind: "resource" as const, id: resource.id };
    const refreshedMap = {
      ...map,
      maintenance: {
        ...map.maintenance,
        lastCheckedAt: "2026-04-25T10:30:00.000Z",
      },
    };

    expect(
      selectNitroSelectionAfterMapUpdate({
        map: refreshedMap,
        currentSelection: selection,
      }),
    ).toEqual(selection);
  });

  it("falls back when the current selection disappears from a refreshed map", () => {
    expect(
      selectNitroSelectionAfterMapUpdate({
        map,
        currentSelection: { kind: "resource", id: "missing-resource" },
      }),
    ).toEqual(selectInitialNitroSelection(map));
  });

  it("uses the routed episode selection when forced by route changes", () => {
    const routedEpisode = map.workEpisodes[1]!;

    expect(
      selectNitroSelectionAfterMapUpdate({
        map,
        currentSelection: { kind: "resource", id: map.resources[0]!.id },
        routeEpisodeId: routedEpisode.id,
        forceRouteEpisodeSelection: true,
      }),
    ).toEqual({ kind: "work-episode", id: routedEpisode.id });
  });

  it("keeps a deeper valid work selection on routed episode refreshes", () => {
    const routedEpisode = map.workEpisodes[0]!;
    const selectedRound = routedEpisode.rounds[0]!;

    expect(
      selectNitroSelectionAfterMapUpdate({
        map,
        currentSelection: { kind: "work-round", id: selectedRound.id },
        routeEpisodeId: routedEpisode.id,
      }),
    ).toEqual({ kind: "work-round", id: selectedRound.id });
  });

  it("surfaces non-ready Cartographer state for seeded maps", () => {
    expect(
      selectNitroMapMaintenanceNotice({
        ...map.maintenance,
        cartographerStatus: "not-run",
        lastCheckedAt: null,
      }),
    ).toBe("Cartographer not run");
    expect(selectNitroMapMaintenanceNotice(map.maintenance)).toBeNull();
  });
});
