import { CircleStopIcon, PlayIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { NitroProjectMap, NitroSelectionTarget } from "../types";

export function NitroWorkPanel(props: {
  map: NitroProjectMap;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  const { map, onSelect } = props;

  return (
    <section className="border-t border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Work</h2>
          <p className="truncate text-xs text-muted-foreground">
            Mock work episodes and trace context that will be inserted by the main agent
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
      <div className="grid max-h-44 gap-2 overflow-auto p-3 md:grid-cols-2">
        {map.workEpisodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-accent"
            onClick={() => onSelect({ kind: "work-episode", id: episode.id })}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-xs font-medium text-foreground">{episode.title}</span>
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
    </section>
  );
}
