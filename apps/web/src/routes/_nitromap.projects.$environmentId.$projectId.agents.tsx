import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectAgentsRouteView() {
  return (
    <NitroMapProjectRoute params={parseNitroMapRouteParams(Route.useParams())} view="agents" />
  );
}

export const Route = createFileRoute("/_nitromap/projects/$environmentId/$projectId/agents")({
  component: ProjectAgentsRouteView,
});
