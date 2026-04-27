import { CircleStopIcon, GitBranchIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type {
  NitroAgentInvocation,
  NitroProjectMap,
  NitroSelectionTarget,
  NitroWorkEpisodeSummary,
  NitroWorkRoundSummary,
} from "../types";
import { DirectionalSvgEdge } from "./DirectionalSvgEdge";

export function NitroWorkPanel(props: {
  map: NitroProjectMap;
  routeEpisodeId?: string | undefined;
  selection: NitroSelectionTarget | null;
  onSelect: (selection: NitroSelectionTarget) => void;
  onSelectEpisodeRoute?: (episodeId: string) => void;
}) {
  const { map, onSelect, onSelectEpisodeRoute, routeEpisodeId, selection } = props;
  const fallbackEpisode = useMemo(() => selectDefaultEpisode(map), [map]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    routeEpisodeId ?? fallbackEpisode?.id ?? null,
  );
  const selectedEpisode =
    map.workEpisodes.find((episode) => episode.id === selectedEpisodeId) ??
    (selectedEpisodeId === routeEpisodeId ? null : fallbackEpisode);
  const fallbackRound = useMemo(() => selectDefaultRound(selectedEpisode), [selectedEpisode]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(fallbackRound?.id ?? null);
  const selectedRound =
    selectedEpisode?.rounds.find((round) => round.id === selectedRoundId) ?? fallbackRound;
  const agentById = useMemo(
    () => new Map(map.agents.map((agent) => [agent.id, agent] as const)),
    [map.agents],
  );

  useEffect(() => {
    if (selection?.kind === "work-episode") {
      setSelectedEpisodeId(selection.id);
      return;
    }
    if (selection?.kind === "work-round") {
      const episode = map.workEpisodes.find((entry) =>
        entry.rounds.some((round) => round.id === selection.id),
      );
      setSelectedEpisodeId(episode?.id ?? null);
      setSelectedRoundId(selection.id);
    }
  }, [map.workEpisodes, selection]);

  useEffect(() => {
    if (routeEpisodeId) {
      setSelectedEpisodeId(routeEpisodeId);
    }
  }, [routeEpisodeId]);

  useEffect(() => {
    setSelectedEpisodeId((current) =>
      current &&
      (current === routeEpisodeId || map.workEpisodes.some((episode) => episode.id === current))
        ? current
        : (fallbackEpisode?.id ?? null),
    );
  }, [fallbackEpisode?.id, map.workEpisodes, routeEpisodeId]);

  useEffect(() => {
    setSelectedRoundId((current) =>
      current && selectedEpisode?.rounds.some((round) => round.id === current)
        ? current
        : (fallbackRound?.id ?? null),
    );
  }, [fallbackRound?.id, selectedEpisode?.rounds]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Work</h2>
          <p className="truncate text-xs text-muted-foreground">
            Episodes contain rounds. Rounds show concrete ownership-agent invocations.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="xs" variant="outline" disabled>
            <PlayIcon />
            Start work
          </Button>
          <Button size="xs" variant="destructive-outline" disabled>
            <CircleStopIcon />
            Abort turn
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[16rem_18rem_minmax(0,1fr)]">
        <div className="min-h-0 border-b border-border md:border-r md:border-b-0">
          <PanelHeader title="Episodes" detail={`${map.workEpisodes.length} project episodes`} />
          <div className="grid max-h-56 content-start gap-2 overflow-auto p-3 md:max-h-none">
            {routeEpisodeId &&
            !map.workEpisodes.some((episode) => episode.id === routeEpisodeId) ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                <span className="block truncate text-xs font-medium text-foreground">
                  Episode unavailable
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  Waiting for episode details.
                </span>
              </div>
            ) : null}
            {map.workEpisodes.map((episode) => (
              <button
                key={episode.id}
                type="button"
                className={cn(
                  "min-w-0 rounded-md border bg-background px-3 py-2 text-left hover:bg-accent",
                  selectedEpisode?.id === episode.id ? "border-primary" : "border-border",
                )}
                onClick={() => {
                  setSelectedEpisodeId(episode.id);
                  setSelectedRoundId(selectDefaultRound(episode)?.id ?? null);
                  onSelect({ kind: "work-episode", id: episode.id });
                  onSelectEpisodeRoute?.(episode.id);
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-medium text-foreground">
                    {episode.title}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {episode.status}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {episode.latestUserMessage}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 border-b border-border md:border-r md:border-b-0">
          <PanelHeader
            title="Rounds"
            detail={
              selectedEpisode
                ? `${selectedEpisode.rounds.length} rounds in selected episode`
                : "No episode selected"
            }
          />
          <div className="grid max-h-56 content-start gap-2 overflow-auto p-3 md:max-h-none">
            {selectedEpisode?.rounds.map((round) => (
              <button
                key={round.id}
                type="button"
                className={cn(
                  "rounded-md border bg-background px-3 py-2 text-left hover:bg-accent",
                  selectedRound?.id === round.id ? "border-primary" : "border-border",
                )}
                onClick={() => {
                  setSelectedRoundId(round.id);
                  onSelect({ kind: "work-round", id: round.id });
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-medium text-foreground">
                    Round {round.index}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {round.status}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {round.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <PanelHeader
            title={selectedRound ? `Round ${selectedRound.index} Trace Graph` : "Round Trace Graph"}
            detail={selectedRound?.title ?? "Select a round to inspect concrete agent work"}
          />
          {selectedRound ? (
            <RoundTraceGraph
              round={selectedRound}
              agentById={agentById}
              selectedInvocationId={selection?.kind === "agent-invocation" ? selection.id : null}
              selectedTraceId={selection?.kind === "round-trace" ? selection.id : null}
              onSelect={onSelect}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              No rounds in this episode yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PanelHeader(props: { title: string; detail: string }) {
  return (
    <div className="border-b border-border px-3 py-2">
      <h3 className="text-xs font-semibold text-foreground">{props.title}</h3>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{props.detail}</p>
    </div>
  );
}

function RoundTraceGraph(props: {
  round: NitroWorkRoundSummary;
  agentById: Map<string, NitroProjectMap["agents"][number]>;
  selectedInvocationId: string | null;
  selectedTraceId: string | null;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  const { agentById, onSelect, round, selectedInvocationId, selectedTraceId } = props;

  return (
    <div className="relative min-h-[24rem] flex-1 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
      >
        {round.invocations.map((invocation) => {
          const parent = findInvocation(round, invocation.parentInvocationId);
          if (!parent) return null;
          return (
            <DirectionalSvgEdge
              key={`${parent.id}:${invocation.id}`}
              x1={parent.position.x}
              y1={parent.position.y}
              x2={invocation.position.x}
              y2={invocation.position.y}
              className="stroke-primary/45"
              arrowClassName="fill-primary/70"
              strokeWidth={0.36}
              targetGap={9}
            />
          );
        })}
      </svg>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        {round.traces.map((trace) => (
          <button
            key={trace.id}
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs shadow-xs",
              selectedTraceId === trace.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background/85 text-muted-foreground hover:bg-accent",
            )}
            onClick={() => onSelect({ kind: "round-trace", id: trace.id })}
          >
            <GitBranchIcon className="size-3.5" />
            {trace.status}
          </button>
        ))}
      </div>

      {round.invocations.map((invocation) => {
        const agent = agentById.get(invocation.agentId);
        return (
          <InvocationNode
            key={invocation.id}
            invocation={invocation}
            agentLabel={agent?.label ?? "Unknown agent"}
            agentKind={agent?.kind ?? "implementation"}
            selected={selectedInvocationId === invocation.id}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function InvocationNode(props: {
  invocation: NitroAgentInvocation;
  agentLabel: string;
  agentKind: string;
  selected: boolean;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  const { agentKind, agentLabel, invocation, onSelect, selected } = props;

  return (
    <button
      type="button"
      className={cn(
        "absolute z-20 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-popover/95 px-3 py-2 text-left shadow-md hover:bg-accent",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
      style={
        {
          left: `${invocation.position.x}%`,
          top: `${invocation.position.y}%`,
        } satisfies CSSProperties
      }
      onClick={() => onSelect({ kind: "agent-invocation", id: invocation.id })}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">{agentLabel}</span>
        <span
          className={cn(
            "size-2 rounded-full",
            invocation.status === "running"
              ? "bg-sky-500"
              : invocation.status === "queued"
                ? "bg-amber-500"
                : invocation.status === "failed" || invocation.status === "aborted"
                  ? "bg-destructive"
                  : "bg-emerald-500",
          )}
        />
      </span>
      <span className="mt-1 block truncate text-[10px] uppercase text-muted-foreground">
        {agentKind} / {invocation.trigger}
      </span>
    </button>
  );
}

function selectDefaultEpisode(map: NitroProjectMap): NitroWorkEpisodeSummary | null {
  return (
    map.workEpisodes
      .filter((episode) => episode.status === "running")
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
    map.workEpisodes.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
    null
  );
}

function selectDefaultRound(episode: NitroWorkEpisodeSummary | null): NitroWorkRoundSummary | null {
  return (
    episode?.rounds
      .filter((round) => round.status === "running")
      .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ??
    episode?.rounds.toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ??
    null
  );
}

function findInvocation(
  round: NitroWorkRoundSummary,
  invocationId: string | null,
): NitroAgentInvocation | null {
  if (!invocationId) return null;
  return round.invocations.find((invocation) => invocation.id === invocationId) ?? null;
}
