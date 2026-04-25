import { Link } from "@tanstack/react-router";
import { ActivityIcon, BotIcon, MapIcon, NetworkIcon, WrenchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SidebarInset } from "~/components/ui/sidebar";
import { scopeProjectRef } from "@t3tools/client-runtime";
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

const VIEW_LABELS: Record<NitroMapView, string> = {
  map: "Map",
  work: "Work",
  "map-maintenance": "Map Maintenance",
  agents: "Agents",
  activity: "Activity",
};

const VIEW_ICONS = {
  map: NetworkIcon,
  work: ActivityIcon,
  "map-maintenance": WrenchIcon,
  agents: BotIcon,
  activity: MapIcon,
} satisfies Record<NitroMapView, typeof ActivityIcon>;

export function NitroMapProjectRoute(props: { params: NitroMapRouteParams; view: NitroMapView }) {
  const { params, view } = props;
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
  const [mapState, setMapState] = useState<{
    key: string;
    map: NitroProjectMap;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    setMapState((current) => (current?.key === mapKey ? current : null));
    void mockNitroMapDataSource.getProjectMap(dataSourceParams).then((nextMap) => {
      if (!disposed) {
        setMapState({ key: mapKey, map: nextMap });
      }
    });
    return () => {
      disposed = true;
    };
  }, [dataSourceParams, mapKey]);

  const map = mapState?.key === mapKey ? mapState.map : null;
  const [selection, setSelection] = useState<NitroSelectionTarget | null>(null);
  const initialSelection = useMemo(() => (map ? selectInitialNitroSelection(map) : null), [map]);

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
          <div className="hidden gap-2 text-xs text-muted-foreground lg:flex">
            <span>{counts.agentCount} agents</span>
            <span>{counts.resourceCount} resources</span>
            <span>{counts.pendingTraceCount} pending traces</span>
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
              {view === "work" ? <NitroWorkPanel map={map} onSelect={setSelection} /> : null}
              {view === "agents" ? <AgentListPanel map={map} onSelect={setSelection} /> : null}
              {view === "activity" ? <ActivityPanel map={map} onSelect={setSelection} /> : null}
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

function AgentListPanel(props: {
  map: NitroProjectMap;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Agents</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Project agents using the shared ownership map
        </p>
      </div>
      <div className="grid flex-1 content-start gap-2 overflow-auto p-3 md:grid-cols-3">
        {props.map.agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-accent"
            onClick={() => props.onSelect({ kind: "agent", id: agent.id })}
          >
            <span className="block truncate text-xs font-medium text-foreground">
              {agent.label}
            </span>
            <span className="mt-1 block truncate text-[10px] uppercase text-muted-foreground">
              {agent.kind} / {agent.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel(props: {
  map: NitroProjectMap;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Trace messages and abortable user interventions
        </p>
      </div>
      <div className="grid flex-1 content-start gap-2 overflow-auto p-3 md:grid-cols-2">
        {props.map.traces.map((trace) => (
          <button
            key={trace.id}
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-accent"
            onClick={() => props.onSelect({ kind: "trace", id: trace.id })}
          >
            <span className="block truncate text-xs font-medium text-foreground">
              {trace.title}
            </span>
            <span className="mt-1 block truncate text-[10px] uppercase text-muted-foreground">
              {trace.status}
            </span>
          </button>
        ))}
        {props.map.interventions.map((intervention) => (
          <button
            key={intervention.id}
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-accent"
            onClick={() => props.onSelect({ kind: "intervention", id: intervention.id })}
          >
            <span className="block truncate text-xs font-medium text-foreground">
              {intervention.title}
            </span>
            <span className="mt-1 block truncate text-[10px] uppercase text-muted-foreground">
              {intervention.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
