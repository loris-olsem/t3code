import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectMapMaintenanceRouteView() {
  return (
    <NitroMapProjectRoute
      params={parseNitroMapRouteParams(Route.useParams())}
      view="map-maintenance"
    />
  );
}

export const Route = createFileRoute(
  "/_nitromap/projects/$environmentId/$projectId/map-maintenance",
)({
  component: ProjectMapMaintenanceRouteView,
});
