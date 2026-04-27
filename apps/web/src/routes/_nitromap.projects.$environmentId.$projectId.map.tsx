import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectMapRouteView() {
  return <NitroMapProjectRoute params={parseNitroMapRouteParams(Route.useParams())} view="map" />;
}

export const Route = createFileRoute("/_nitromap/projects/$environmentId/$projectId/map")({
  component: ProjectMapRouteView,
});
