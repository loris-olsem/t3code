import { Link, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, NetworkIcon, WrenchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SidebarInset } from "~/components/ui/sidebar";
import { scopeProjectRef } from "@nitrocode/client-runtime";
import { selectEnvironmentState, selectProjectByRef, useStore } from "~/store";
import { Button } from "~/components/ui/button";
import { mockNitroMapDataSource } from "../mockData";
import { buildNitroMapRouteParams, NITRO_MAP_ROUTE_BY_VIEW } from "../routes";
import {
  isNitroSelectionEqual,
  selectInitialNitroSelection,
  selectNitroMapCounts,
  selectNitroMapInspection,
} from "../selectors";
import type {
  NitroMapRouteParams,
  NitroMapView,
  NitroProjectMap,
  NitroSelectionTarget,
} from "../types";
import { NitroInspectorPanel } from "./NitroInspectorPanel";
import { NitroMapCanvas } from "./NitroMapCanvas";
import { NitroMapMaintenancePanel } from "./NitroMapMaintenancePanel";
import { NitroWorkPanel } from "./NitroWorkPanel";
import { getNitroEpisodesForProject, useNitroWorkEpisodeStore } from "../workEpisodeStore";

const VIEW_LABELS: Record<NitroMapView, string> = {
  map: "Map",
  work: "Work",
  "map-maintenance": "Map Maintenance",
};

const VIEW_ICONS = {
  map: NetworkIcon,
  work: ActivityIcon,
  "map-maintenance": WrenchIcon,
} satisfies Record<NitroMapView, typeof ActivityIcon>;

export function NitroMapProjectRoute(props: {
  params: NitroMapRouteParams;
  view: NitroMapView;
  episodeId?: string;
}) {
  const { episodeId, params, view } = props;
  const navigate = useNavigate();
  const routeParams = buildNitroMapRouteParams(params);
  const projectRef = useMemo(
    () => scopeProjectRef(params.environmentId, params.projectId),
    [params.environmentId, params.projectId],
  );
  const storeProject = useStore((state) => selectProjectByRef(state, projectRef));
  const bootstrapComplete = useStore(
    (state) => selectEnvironmentState(state, params.environmentId).bootstrapComplete,
  );
  const mapKey = `${params.environmentId}:${params.projectId}`;
  const dataSourceParams = useMemo(
    () => ({
      environmentId: params.environmentId,
      projectId: params.projectId,
    }),
    [params.environmentId, params.projectId],
  );
  const hasProjectMap = mockNitroMapDataSource.hasProjectMap(dataSourceParams);
  const [mapState, setMapState] = useState<{
    key: string;
    map: NitroProjectMap;
  } | null>(null);
  const realWorkEpisodes = useNitroWorkEpisodeStore(
    useMemo(
      () => (state) => getNitroEpisodesForProject(state, params.environmentId, params.projectId),
      [params.environmentId, params.projectId],
    ),
  );

  useEffect(() => {
    let disposed = false;
    setMapState((current) => (current?.key === mapKey ? current : null));
    if (!hasProjectMap) {
      return () => {
        disposed = true;
      };
    }
    void mockNitroMapDataSource.getProjectMap(dataSourceParams).then((nextMap) => {
      if (!disposed) {
        setMapState({ key: mapKey, map: nextMap });
      }
    });
    return () => {
      disposed = true;
    };
  }, [dataSourceParams, hasProjectMap, mapKey]);

  const baseMap = mapState?.key === mapKey ? mapState.map : null;
  const map = useMemo(
    () =>
      baseMap
        ? {
            ...baseMap,
            workEpisodes: realWorkEpisodes.length > 0 ? realWorkEpisodes : baseMap.workEpisodes,
          }
        : null,
    [baseMap, realWorkEpisodes],
  );
  const [selection, setSelection] = useState<NitroSelectionTarget | null>(null);
  const initialSelection = useMemo<NitroSelectionTarget | null>(
    () =>
      map
        ? episodeId && map.workEpisodes.some((episode) => episode.id === episodeId)
          ? { kind: "work-episode" as const, id: episodeId }
          : selectInitialNitroSelection(map)
        : null,
    [episodeId, map],
  );

  useEffect(() => {
    setSelection((current) =>
      isNitroSelectionEqual(current, initialSelection) ? current : initialSelection,
    );
  }, [initialSelection]);

  const inspection = useMemo(
    () => (map ? selectNitroMapInspection(map, selection) : null),
    [map, selection],
  );
  const counts = useMemo(() => (map ? selectNitroMapCounts(map) : null), [map]);
  const projectName = storeProject?.name ?? "";

  if (!bootstrapComplete) {
    return (
      <NitroMapStatusState title="Loading project map" detail="Waiting for environment data." />
    );
  }

  if (!storeProject) {
    return (
      <SidebarInset className="h-dvh min-h-0 overflow-auto bg-background text-foreground md:overflow-hidden md:overscroll-y-none">
        <div className="flex h-full items-center justify-center px-6">
          <section className="max-w-md rounded-md border border-border bg-card p-5">
            <h1 className="text-sm font-semibold text-foreground">Project unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This ownership map belongs to a project that is not present in the current
              environment.
            </p>
          </section>
        </div>
      </SidebarInset>
    );
  }

  if (!hasProjectMap) {
    return (
      <NitroMapStatusState
        title="Project map unavailable"
        detail="Run the Cartographer before starting Nitro work for this project."
      />
    );
  }

  if (!map || !counts) {
    return (
      <NitroMapStatusState title="Loading project map" detail="Preparing ownership map data." />
    );
  }

  if (
    view === "work" &&
    episodeId &&
    !map.workEpisodes.some((episode) => episode.id === episodeId)
  ) {
    return (
      <NitroMapStatusState
        title="Episode unavailable"
        detail="This work episode is not present in the project map."
      />
    );
  }

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-auto bg-background text-foreground md:overflow-hidden md:overscroll-y-none">
      <div className="flex min-h-full flex-col md:h-full md:min-h-0">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">{projectName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              Ownership map shared by this project&apos;s conversations
            </p>
          </div>
          <div className="hidden gap-2 text-xs text-muted-foreground lg:flex">
            <span>{counts.agentCount} agents</span>
            <span>{counts.resourceCount} resources</span>
            <span>{counts.pendingTraceCount} pending round traces</span>
          </div>
        </header>

        <nav className="flex min-h-11 items-center gap-1 border-b border-border px-3">
          {(Object.keys(VIEW_LABELS) as NitroMapView[]).map((item) => {
            const Icon = VIEW_ICONS[item];
            return (
              <Button
                key={item}
                size="xs"
                variant={item === view ? "secondary" : "ghost"}
                render={
                  <Link
                    to={NITRO_MAP_ROUTE_BY_VIEW[item]}
                    params={routeParams}
                    aria-current={item === view ? "page" : undefined}
                  />
                }
              >
                <Icon />
                {VIEW_LABELS[item]}
              </Button>
            );
          })}
        </nav>

        {view === "map-maintenance" ? (
          <main className="min-h-0 flex-1">
            <NitroMapMaintenancePanel
              map={map}
              selectedActionId={selection?.kind === "reconciliation-action" ? selection.id : null}
              onSelect={setSelection}
            />
          </main>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <main className="flex min-h-0 flex-1 flex-col">
              {view === "map" ? (
                <NitroMapCanvas map={map} selection={selection} onSelect={setSelection} />
              ) : null}
              {view === "work" ? (
                <NitroWorkPanel
                  map={map}
                  selection={selection}
                  onSelect={setSelection}
                  onSelectEpisodeRoute={(selectedEpisodeId) => {
                    void navigate({
                      to: "/projects/$environmentId/$projectId/work/$episodeId",
                      params: {
                        ...routeParams,
                        episodeId: selectedEpisodeId,
                      },
                    });
                  }}
                />
              ) : null}
            </main>
            <NitroInspectorPanel inspection={inspection} />
          </div>
        )}
      </div>
    </SidebarInset>
  );
}

function NitroMapStatusState(props: { title: string; detail: string }) {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-auto bg-background text-foreground md:overflow-hidden md:overscroll-y-none">
      <div className="flex h-full items-center justify-center px-6">
        <section className="max-w-md rounded-md border border-border bg-card p-5">
          <h1 className="text-sm font-semibold text-foreground">{props.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.detail}</p>
        </section>
      </div>
    </SidebarInset>
  );
}
