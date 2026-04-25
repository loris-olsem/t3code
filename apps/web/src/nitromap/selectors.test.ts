import { describe, expect, it } from "vitest";

import { buildMockNitroProjectMap, buildMockNitroRouteParams } from "./mockData";
import {
  selectForegroundWorkEpisode,
  selectInitialNitroSelection,
  selectNitroMapCounts,
  selectNitroMapInspection,
} from "./selectors";

const map = buildMockNitroProjectMap(
  buildMockNitroRouteParams({
    environmentId: "env-test",
    projectId: "project-test",
  }),
);

describe("nitromap selectors", () => {
  it("summarizes ownership map counts", () => {
    expect(selectNitroMapCounts(map)).toMatchObject({
      agentCount: 5,
      implementationAgentCount: 2,
      managementAgentCount: 3,
      resourceCount: 4,
      runningWorkEpisodeCount: 1,
      pendingTraceCount: 1,
      openInterventionCount: 1,
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

  it("resolves a responsibility to both the watching agent and resource", () => {
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
    expect(inspection.resource?.path.length).toBeGreaterThan(0);
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

  it("keeps Cartographer and user-facing main agents outside the ownership-agent graph", () => {
    expect(map.agents.some((agent) => agent.label === map.maintenance.cartographerLabel)).toBe(
      false,
    );
    expect(map.agents.some((agent) => agent.label === "Conversation main agent")).toBe(false);
    expect(map.workEpisodes[0]?.mainAgent.label).toBe("Conversation main agent");

    const actionInspection = selectNitroMapInspection(map, {
      kind: "reconciliation-action",
      id: map.maintenance.actions[0]!.id,
    });
    expect(actionInspection?.kind).toBe("reconciliation-action");
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
});
