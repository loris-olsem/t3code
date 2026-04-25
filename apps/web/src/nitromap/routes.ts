import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import type { NitroMapRouteParams, NitroMapView } from "./types";

export const NITRO_MAP_ROUTE_BY_VIEW = {
  map: "/projects/$environmentId/$projectId/map",
  work: "/projects/$environmentId/$projectId/work",
  "map-maintenance": "/projects/$environmentId/$projectId/map-maintenance",
  agents: "/projects/$environmentId/$projectId/agents",
  activity: "/projects/$environmentId/$projectId/activity",
} as const satisfies Record<NitroMapView, string>;

export const DEFAULT_NITRO_MAP_VIEW: NitroMapView = "map";

export function buildNitroMapRouteParams(params: NitroMapRouteParams): {
  environmentId: EnvironmentId;
  projectId: ProjectId;
} {
  return {
    environmentId: params.environmentId,
    projectId: params.projectId,
  };
}

export function parseNitroMapRouteParams(params: {
  environmentId: string;
  projectId: string;
}): NitroMapRouteParams {
  return {
    environmentId: params.environmentId as EnvironmentId,
    projectId: params.projectId as ProjectId,
  };
}
