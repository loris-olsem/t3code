import { CheckIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { NitroProjectMap, NitroSelectionTarget } from "../types";

export function NitroMapMaintenancePanel(props: {
  map: NitroProjectMap;
  selectedActionId: string | null;
  onSelect: (selection: NitroSelectionTarget) => void;
}) {
  const { map, onSelect } = props;

  return (
    <section className="flex h-full min-h-0 flex-col bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Map Maintenance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Read-only {map.maintenance.cartographerLabel} mock actions for ownership map cleanup
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {map.maintenance.actions.map((action) => (
          <div
            key={action.id}
            className={`rounded-md border bg-background p-3 ${
              props.selectedActionId === action.id ? "border-primary" : "border-border"
            }`}
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => onSelect({ kind: "reconciliation-action", id: action.id })}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-foreground">{action.title}</span>
                <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                  {action.status}
                </span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {action.reason}
              </span>
            </button>
            <div className="mt-3 flex gap-2">
              <Button size="xs" variant="outline" disabled>
                <CheckIcon />
                Accept
              </Button>
              <Button size="xs" variant="outline" disabled>
                <XIcon />
                Decline
              </Button>
            </div>
            {props.selectedActionId === action.id ? (
              <dl className="mt-3 grid gap-2 border-t border-border pt-3">
                <div className="grid gap-1">
                  <dt className="text-[10px] font-medium uppercase text-muted-foreground">
                    Target
                  </dt>
                  <dd className="text-xs text-foreground">{action.targetKind}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-[10px] font-medium uppercase text-muted-foreground">
                    Detail
                  </dt>
                  <dd className="text-xs leading-5 text-foreground">{action.reason}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
