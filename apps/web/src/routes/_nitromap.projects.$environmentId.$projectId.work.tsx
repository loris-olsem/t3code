import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectWorkRouteView() {
  return <NitroMapProjectRoute params={parseNitroMapRouteParams(Route.useParams())} view="work" />;
}

export const Route = createFileRoute("/_nitromap/projects/$environmentId/$projectId/work")({
  component: ProjectWorkRouteView,
});
