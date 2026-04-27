import { Link, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, NetworkIcon, WrenchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SidebarInset } from "~/components/ui/sidebar";
import { scopeProjectRef } from "@nitrocode/client-runtime";
import { selectEnvironmentState, selectProjectByRef, useStore } from "~/store";
import { Button } from "~/components/ui/button";
import { useEnvironmentApi } from "~/environmentApi";
import { createNitroMapBackendDataSource } from "../backendDataSource";
import { buildNitroMapRouteParams, NITRO_MAP_ROUTE_BY_VIEW } from "../routes";
import {
  isNitroSelectionEqual,
  selectNitroMapCounts,
  selectNitroMapInspection,
  selectNitroMapMaintenanceNotice,
  selectNitroSelectionAfterMapUpdate,
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
import {
  getNitroEpisodesForProject,
  nitroProjectKey,
  useNitroWorkEpisodeStore,
} from "../workEpisodeStore";

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
  const environmentApi = useEnvironmentApi(params.environmentId);
  const dataSource = useMemo(
    () =>
      bootstrapComplete && environmentApi
        ? createNitroMapBackendDataSource(environmentApi, {
            getOptimisticWorkEpisodes: (sourceParams) =>
              getNitroEpisodesForProject(
                useNitroWorkEpisodeStore.getState(),
                sourceParams.environmentId,
                sourceParams.projectId,
              ),
            subscribeOptimisticWorkEpisodes: (sourceParams, listener) => {
              const projectKey = nitroProjectKey(
                sourceParams.environmentId,
                sourceParams.projectId,
              );
              return useNitroWorkEpisodeStore.subscribe((state, previousState) => {
                if (
                  state.episodesByProjectKey[projectKey] !==
                  previousState.episodesByProjectKey[projectKey]
                ) {
                  listener();
                }
              });
            },
          })
        : null,
    [bootstrapComplete, environmentApi],
  );
  const [mapState, setMapState] = useState<{
    key: string;
    map: NitroProjectMap;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setMapState((current) => (current?.key === mapKey ? current : null));
    setMapError(null);
    if (!dataSource) {
      return () => {
        disposed = true;
      };
    }
    const unsubscribe = dataSource.subscribeProjectMap(dataSourceParams, (event) => {
      if (disposed) return;
      switch (event.kind) {
        case "snapshot":
          setMapError(null);
          setMapState({ key: mapKey, map: event.map });
          return;
        case "stale":
          return;
        case "error":
          setMapError(event.message);
          return;
      }
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [dataSource, dataSourceParams, mapKey]);

  const map = mapState?.key === mapKey ? mapState.map : null;
  const [selection, setSelection] = useState<NitroSelectionTarget | null>(null);
  const lastRouteEpisodeIdRef = useRef<string | undefined>(undefined);
  const lastRouteEpisodePresentRef = useRef(false);
  useEffect(() => {
    setSelection((current) => {
      const routeEpisodeIdChanged = lastRouteEpisodeIdRef.current !== episodeId;
      const routeEpisodePresent = Boolean(
        map && episodeId && map.workEpisodes.some((episode) => episode.id === episodeId),
      );
      const routeEpisodeResolved = !lastRouteEpisodePresentRef.current && routeEpisodePresent;
      lastRouteEpisodeIdRef.current = episodeId;
      lastRouteEpisodePresentRef.current = routeEpisodePresent;
      const nextSelection = map
        ? selectNitroSelectionAfterMapUpdate({
            map,
            currentSelection: current,
            routeEpisodeId: episodeId,
            forceRouteEpisodeSelection: routeEpisodeIdChanged || routeEpisodeResolved,
          })
        : null;
      return isNitroSelectionEqual(current, nextSelection) ? current : nextSelection;
    });
  }, [episodeId, map]);

  const inspection = useMemo(
    () => (map ? selectNitroMapInspection(map, selection) : null),
    [map, selection],
  );
  const counts = useMemo(() => (map ? selectNitroMapCounts(map) : null), [map]);
  const projectName = storeProject?.name ?? "";
  const maintenanceNotice = map ? selectNitroMapMaintenanceNotice(map.maintenance) : null;

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

  if (mapError && !map) {
    return <NitroMapStatusState title="Project map failed to load" detail={mapError} />;
  }

  if (!map || !counts) {
    return (
      <NitroMapStatusState title="Loading project map" detail="Preparing ownership map data." />
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
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {mapError ? (
              <span className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">
                Map stream reconnecting
              </span>
            ) : null}
            {maintenanceNotice ? (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                {maintenanceNotice}
              </span>
            ) : null}
            <div className="hidden gap-2 lg:flex">
              <span>{counts.agentCount} agents</span>
              <span>{counts.resourceCount} resources</span>
              <span>{counts.pendingTraceCount} pending round traces</span>
            </div>
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
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <main className="min-h-0 flex-1">
              <NitroMapMaintenancePanel
                map={map}
                selectedActionId={selection?.kind === "reconciliation-action" ? selection.id : null}
                onSelect={setSelection}
              />
            </main>
            <NitroInspectorPanel inspection={inspection} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <main className="flex min-h-0 flex-1 flex-col">
              {view === "map" ? (
                <NitroMapCanvas map={map} selection={selection} onSelect={setSelection} />
              ) : null}
              {view === "work" ? (
                <NitroWorkPanel
                  map={map}
                  routeEpisodeId={episodeId}
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
