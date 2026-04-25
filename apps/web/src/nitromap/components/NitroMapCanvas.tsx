import { GitBranchIcon, LayersIcon, NetworkIcon } from "lucide-react";
import { useMemo, type CSSProperties } from "react";

import { cn } from "~/lib/utils";
import type { NitroProjectMap, NitroSelectionTarget } from "../types";

interface NitroMapCanvasProps {
  map: NitroProjectMap;
  selection: NitroSelectionTarget | null;
  onSelect: (selection: NitroSelectionTarget) => void;
}

export function NitroMapCanvas(props: NitroMapCanvasProps) {
  const { map, onSelect, selection } = props;
  const agentById = useMemo(
    () => new Map(map.agents.map((agent) => [agent.id, agent] as const)),
    [map.agents],
  );
  const resourceById = useMemo(
    () => new Map(map.resources.map((resource) => [resource.id, resource] as const)),
    [map.resources],
  );

  return (
    <section className="relative min-h-[22rem] flex-1 overflow-hidden border-r border-border bg-background md:min-h-[30rem]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
      >
        {map.supervisionEdges.map((edge) => {
          const parent = agentById.get(edge.parentAgentId);
          const child = agentById.get(edge.childAgentId);
          if (!parent || !child) return null;
          const active = selection?.kind === "supervision-edge" && selection.id === edge.id;
          return (
            <line
              key={edge.id}
              x1={parent.position.x}
              y1={parent.position.y}
              x2={child.position.x}
              y2={child.position.y}
              className={active ? "stroke-primary" : "stroke-muted-foreground/45"}
              strokeWidth={active ? 0.55 : 0.28}
              strokeLinecap="round"
            />
          );
        })}
        {map.ownershipEdges.map((edge) => {
          const agent = agentById.get(edge.agentId);
          const resource = resourceById.get(edge.resourceId);
          if (!agent || !resource) return null;
          const active = selection?.kind === "ownership-edge" && selection.id === edge.id;
          return (
            <line
              key={edge.id}
              x1={agent.position.x}
              y1={agent.position.y}
              x2={resource.position.x}
              y2={resource.position.y}
              className={active ? "stroke-emerald-500" : "stroke-emerald-500/35"}
              strokeDasharray="1.4 1.4"
              strokeWidth={active ? 0.55 : 0.32}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        {map.supervisionEdges.map((edge) => (
          <button
            key={edge.id}
            type="button"
            aria-label="Inspect supervision edge"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground shadow-xs",
              selection?.kind === "supervision-edge" && selection.id === edge.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background/85 hover:bg-accent",
            )}
            onClick={() => onSelect({ kind: "supervision-edge", id: edge.id })}
          >
            <GitBranchIcon className="size-3.5" />
            Supervision
          </button>
        ))}
        {map.ownershipEdges.map((edge) => (
          <button
            key={edge.id}
            type="button"
            aria-label="Inspect ownership edge"
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground shadow-xs",
              selection?.kind === "ownership-edge" && selection.id === edge.id
                ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                : "border-border bg-background/85 hover:bg-accent",
            )}
            onClick={() => onSelect({ kind: "ownership-edge", id: edge.id })}
          >
            <NetworkIcon className="size-3.5" />
            Ownership
          </button>
        ))}
      </div>

      {map.resources.map((resource) => (
        <button
          key={resource.id}
          type="button"
          className={cn(
            "absolute z-20 w-36 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card/95 px-3 py-2 text-left shadow-sm transition-colors hover:bg-accent",
            selection?.kind === "resource" && selection.id === resource.id
              ? "border-primary ring-1 ring-primary"
              : "border-border",
          )}
          style={
            {
              left: `${resource.position.x}%`,
              top: `${resource.position.y}%`,
            } satisfies CSSProperties
          }
          onClick={() => onSelect({ kind: "resource", id: resource.id })}
        >
          <span className="flex items-center gap-2 text-xs font-medium text-foreground">
            <LayersIcon className="size-3.5 text-muted-foreground" />
            <span className="truncate">{resource.label}</span>
          </span>
          <span className="mt-1 block truncate text-[10px] text-muted-foreground">
            {resource.path}
          </span>
        </button>
      ))}

      {map.agents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          className={cn(
            "absolute z-30 w-40 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-popover/95 px-3 py-2 text-left shadow-md transition-colors hover:bg-accent",
            selection?.kind === "agent" && selection.id === agent.id
              ? "border-primary ring-1 ring-primary"
              : "border-border",
          )}
          style={
            {
              left: `${agent.position.x}%`,
              top: `${agent.position.y}%`,
            } satisfies CSSProperties
          }
          onClick={() => onSelect({ kind: "agent", id: agent.id })}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">{agent.label}</span>
            <span
              className={cn(
                "size-2 rounded-full",
                agent.status === "working"
                  ? "bg-sky-500"
                  : agent.status === "waiting"
                    ? "bg-amber-500"
                    : agent.status === "blocked"
                      ? "bg-destructive"
                      : "bg-muted-foreground/45",
              )}
            />
          </span>
          <span className="mt-1 block text-[10px] uppercase text-muted-foreground">
            {agent.kind}
          </span>
        </button>
      ))}

      <div className="absolute bottom-4 left-4 z-10 rounded-md border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
        Solid lines wake supervising agents. Dashed lines show watched or owned resources.
      </div>
    </section>
  );
}
