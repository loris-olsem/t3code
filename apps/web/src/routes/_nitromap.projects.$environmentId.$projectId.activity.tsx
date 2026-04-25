import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectActivityRouteView() {
  return (
    <NitroMapProjectRoute params={parseNitroMapRouteParams(Route.useParams())} view="activity" />
  );
}

export const Route = createFileRoute("/_nitromap/projects/$environmentId/$projectId/activity")({
  component: ProjectActivityRouteView,
});
