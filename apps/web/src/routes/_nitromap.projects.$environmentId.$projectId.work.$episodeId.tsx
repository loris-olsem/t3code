import { createFileRoute } from "@tanstack/react-router";

import { NitroMapProjectRoute } from "../nitromap/components/NitroMapProjectRoute";
import { parseNitroMapRouteParams } from "../nitromap/routes";

function ProjectWorkDetailRouteView() {
  const params = Route.useParams();
  return (
    <NitroMapProjectRoute
      params={parseNitroMapRouteParams(params)}
      view="work"
      episodeId={params.episodeId}
    />
  );
}

export const Route = createFileRoute(
  "/_nitromap/projects/$environmentId/$projectId/work/$episodeId",
)({
  component: ProjectWorkDetailRouteView,
});
