import type { NitroInspection } from "../selectors";
import type { NitroResponsibilityQueryDefinition } from "../types";

function Row(props: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[10px] font-medium uppercase text-muted-foreground">{props.label}</dt>
      <dd className="min-w-0 break-words text-xs text-foreground">{props.value ?? "None"}</dd>
    </div>
  );
}

function formatQueryDefinition(definition: NitroResponsibilityQueryDefinition): string {
  switch (definition.kind) {
    case "path-glob":
      return definition.patterns.join(", ");
    case "path-set":
      return definition.paths.join(", ");
    case "concept":
      return definition.key;
  }
}

export function NitroInspectorPanel(props: { inspection: NitroInspection | null }) {
  const { inspection } = props;

  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-border bg-card md:w-80">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
        <p className="mt-1 text-xs text-muted-foreground">Selected map object details</p>
      </div>
      <div className="flex-1 space-y-4 overflow-auto p-4">
        {!inspection ? (
          <p className="text-sm text-muted-foreground">
            Select an agent, resource, edge, or trace.
          </p>
        ) : null}
        {inspection?.kind === "agent" ? (
          <dl className="space-y-3">
            <Row label="Agent" value={inspection.agent.label} />
            <Row label="Kind" value={inspection.agent.kind} />
            <Row label="Status" value={inspection.agent.status} />
            <Row label="Purpose" value={inspection.agent.purpose} />
            <Row
              label="Supervises"
              value={
                inspection.supervisedAgents.length > 0
                  ? inspection.supervisedAgents.map((agent) => agent.label).join(", ")
                  : "No child agents"
              }
            />
          </dl>
        ) : null}
        {inspection?.kind === "resource" ? (
          <dl className="space-y-3">
            <Row label="Resource" value={inspection.resource.label} />
            <Row label="Kind" value={inspection.resource.kind} />
            <Row label="Path" value={inspection.resource.path} />
            <Row
              label="Responsibilities"
              value={
                inspection.responsibilities.length > 0
                  ? inspection.responsibilities.map((item) => item.label).join(", ")
                  : "Unassigned"
              }
            />
          </dl>
        ) : null}
        {inspection?.kind === "responsibility" ? (
          <dl className="space-y-3">
            <Row label="Responsibility" value={inspection.responsibility.label} />
            <Row label="Status" value={inspection.responsibility.status} />
            <Row label="Agent" value={inspection.agent?.label} />
            <Row label="Resource" value={inspection.resource?.label} />
            <Row label="Query" value={inspection.responsibility.query.label} />
            <Row label="Query kind" value={inspection.responsibility.query.definition.kind} />
            <Row
              label="Scope"
              value={formatQueryDefinition(inspection.responsibility.query.definition)}
            />
            <Row label="Rationale" value={inspection.responsibility.query.rationale} />
          </dl>
        ) : null}
        {inspection?.kind === "supervision-edge" ? (
          <dl className="space-y-3">
            <Row label="Edge" value="Supervision" />
            <Row label="Parent" value={inspection.parent?.label} />
            <Row label="Child" value={inspection.child?.label} />
          </dl>
        ) : null}
        {inspection?.kind === "ownership-edge" ? (
          <dl className="space-y-3">
            <Row label="Edge" value="Ownership or watch" />
            <Row label="Responsibility" value={inspection.responsibility?.label} />
            <Row label="Agent" value={inspection.agent?.label} />
            <Row label="Resource" value={inspection.resource?.label} />
          </dl>
        ) : null}
        {inspection?.kind === "work-episode" ? (
          <dl className="space-y-3">
            <Row label="Episode" value={inspection.episode.title} />
            <Row label="Status" value={inspection.episode.status} />
            <Row
              label="Main agent"
              value={`${inspection.episode.mainAgent.label} (${inspection.episode.mainAgent.status})`}
            />
            <Row label="Latest user message" value={inspection.episode.latestUserMessage} />
            <Row label="Rounds" value={String(inspection.rounds.length)} />
            <Row
              label="Blocking"
              value={
                inspection.episode.blockingItems.length > 0
                  ? inspection.episode.blockingItems.map((item) => item.label).join(", ")
                  : "None"
              }
            />
          </dl>
        ) : null}
        {inspection?.kind === "work-round" ? (
          <dl className="space-y-3">
            <Row
              label="Round"
              value={`Round ${inspection.round.index}: ${inspection.round.title}`}
            />
            <Row label="Status" value={inspection.round.status} />
            <Row label="Episode" value={inspection.episode?.title} />
            <Row label="Started by" value={inspection.round.startedByUserMessage} />
            <Row
              label="Result message"
              value={inspection.round.resultMessageId ?? "Not posted yet"}
            />
            <Row label="Traces" value={String(inspection.round.traces.length)} />
            <Row label="Invocations" value={String(inspection.round.invocations.length)} />
          </dl>
        ) : null}
        {inspection?.kind === "round-trace" ? (
          <dl className="space-y-3">
            <Row label="Trace" value={inspection.trace.title} />
            <Row label="Status" value={inspection.trace.status} />
            <Row label="Episode" value={inspection.episode?.title} />
            <Row label="Round" value={inspection.round?.title} />
            <Row label="Summary" value={inspection.trace.summary} />
            <Row
              label="Invocations"
              value={
                inspection.invocations.length > 0
                  ? inspection.invocations.map((invocation) => invocation.status).join(", ")
                  : "None"
              }
            />
          </dl>
        ) : null}
        {inspection?.kind === "agent-invocation" ? (
          <dl className="space-y-3">
            <Row label="Invocation" value={inspection.agent?.label} />
            <Row label="Agent kind" value={inspection.agent?.kind} />
            <Row label="Status" value={inspection.invocation.status} />
            <Row label="Trigger" value={inspection.invocation.trigger} />
            <Row label="Round" value={inspection.round?.title} />
            <Row label="Trace" value={inspection.trace?.title} />
            <Row label="Summary" value={inspection.invocation.summary} />
          </dl>
        ) : null}
        {inspection?.kind === "reconciliation-action" ? (
          <dl className="space-y-3">
            <Row label="Action" value={inspection.action.title} />
            <Row label="Status" value={inspection.action.status} />
            <Row label="Target" value={inspection.action.targetKind} />
            <Row label="Reason" value={inspection.action.reason} />
          </dl>
        ) : null}
      </div>
    </aside>
  );
}
