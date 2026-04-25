# NitroMap Preparation Plan

## Purpose

This document is about preparing T3 Code for the NitroMap direction without implementing the real ownership-map intelligence yet.

The goal of this phase is structural: reshape the app so the product can become map-first, project-first, and work-episode-based while current provider/thread execution keeps working underneath. New NitroMap surfaces may use mocked data and placeholder services at first. Those mocks are not throwaway UI hacks; they should define the seams where real ownership agents, responsibility queries, map reconciliation actions, and interventions will later connect.

This is a preparation plan, not the final NitroMap implementation plan.

## Current Constraints

The current product is deeply thread-centric.

- Authenticated routes are wrapped in `AppSidebarLayout`, which renders the existing thread sidebar.
- The primary public thread route is `/$environmentId/$threadId`; the current `_chat` route group is pathless.
- `ChatView` owns the main thread experience, including timeline, composer, plan sidebar, diff controls, branch/worktree controls, terminal drawer, approvals, and provider state.
- The client store is organized around projects and threads.
- The server orchestration contracts expose project and thread aggregates only.
- Provider sessions are keyed by `threadId`.
- Shell and detail subscriptions are split into `subscribeShell` and `subscribeThread`.
- Persistence has event sourcing and projections, but projection tables are currently project/thread/message/session/turn oriented.

The good news is that the repo already has several architectural qualities that fit NitroMap:

- schema-first contracts in `packages/contracts`
- server-authoritative event sourcing
- projection tables for UI read models
- typed websocket/RPC boundaries
- queue-backed workers for asynchronous provider and checkpoint flows
- clear package roles
- focused shared utility exports
- browser-side state normalization and memoized selectors
- strong test culture around logic and projection behavior

The preparation work should preserve those qualities.

## Preparation Strategy

Do not try to build the real Cartographer, ownership agents, or responsibility-query evaluator in the first UI cut.

Instead, introduce the NitroMap product structure with mocked domain data:

- map canvas with mocked resources
- mocked ownership agents
- mocked responsibility query metadata
- mocked interventions
- mocked map reconciliation action history
- mocked active work episode summary

The mock layer should be explicit and replaceable. It should live behind a small interface that resembles the future real read model. This prevents UI code from hardcoding fake objects in components and makes the eventual backend integration much cleaner.

The first functional target is:

> A user opens a project and sees a NitroMap shell instead of a chat-first thread layout. The shell shows a map-first project surface with mocked ownership data and a compact work panel. Existing transcript routes remain available, but they are visually demoted.

Call this target the first user-visible cut. It is complete only when all of these are true:

- `/projects/$environmentId/$projectId/map` renders inside a NitroMap shell, not the current thread-sidebar-first shell.
- The route is reachable from existing authenticated navigation.
- The route uses deterministic mock data scoped by `environmentId` and `projectId`.
- The visible project surface contains a map, work summary, map maintenance summary, and inspector.
- `/$environmentId/$threadId` remains usable as the existing compatibility transcript route.
- New NitroMap surfaces do not expose `threadId` as the user-facing product identity.

This first user-visible cut is complete at the end of Milestone 4. Milestone 3 may add the route and shell stub, but it is not complete until the map, work summary, map maintenance summary, and inspector are all present.

At the end of Milestone 4, `Start work` is visible only as a disabled, non-interactive affordance. Real launch/link behavior through the thread-backed work-episode adapter is introduced in Milestone 5.

## Product Structure To Prepare

The prepared app should move toward these top-level concepts:

- project
- ownership map
- work episode
- work round
- Map Maintenance

Existing concepts should map as follows:

- current project -> NitroMap project
- current thread -> main-agent conversation that can launch one or more Nitro work episodes
- current regular chat submit, including Enter -> ordinary main-agent conversation message when no episode is running; no work episode by itself
- current Nitro submit button -> creates a new work episode from the current conversation prompt and begins the first round
- current messages -> main-agent conversation transcript; includes compact `system` round-output messages with links to episode and round details
- current activities -> raw material for round execution state, blockers, and trace inspection
- current proposed plans -> possible work-episode artifacts
- current checkpoints/diffs -> changed resources and result inspection
- current branch/worktree controls -> execution-context controls, not ownership model

This lets current functionality continue while the product language changes.

Canonical transitional names:

| Concept                   | UI-local type during preparation | Future contract/schema name    | Notes                                                                                                                                                                           |
| ------------------------- | -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| project view              | `NitroMapProjectView`            | `NitroMapProjectSnapshot`      | UI view may include derived layout and summary data. Contract snapshot should remain schema-only.                                                                               |
| map                       | `NitroMapSnapshot`               | `NitroMapSnapshot`             | Contains resources, agents, responsibilities, edges, interventions, and map reconciliation actions.                                                                             |
| resource                  | `NitroResource`                  | `NitroResource`                | Stable domain resource, not a display label or worktree.                                                                                                                        |
| visual resource node      | `NitroResourceNode`              | none                           | UI layout wrapper around `NitroResource`.                                                                                                                                       |
| ownership agent           | `NitroOwnershipAgent`            | `NitroOwnershipAgent`          | Covers implementation and management agents. Do not call these threads.                                                                                                         |
| responsibility            | `NitroResponsibility`            | `NitroResponsibility`          | Owns the query describing what resources are meant.                                                                                                                             |
| responsibility query      | `NitroResponsibilityQuery`       | `NitroResponsibilityQuery`     | Non-abstract responsibilities must include this.                                                                                                                                |
| visual ownership edge     | `NitroOwnershipEdge`             | `NitroOwnershipEdge`           | UI/read-model edge linking an agent, responsibility, and resource match. Distinct from the final model's `SupervisionEdge`.                                                     |
| supervision edge          | `NitroSupervisionEdge`           | `NitroSupervisionEdge`         | Management-hierarchy edge for wake behavior. Mock/read-model data should include these early so the map can show who supervises whom. Do not use `NitroOwnershipEdge` for this. |
| intervention              | `NitroIntervention`              | `NitroIntervention`            | Ownership-agent or work-episode feedback surfaced in the map/work UI. Do not use this as a generic project activity record.                                                     |
| map reconciliation action | `NitroMapReconciliationAction`   | `NitroMapReconciliationAction` | Use this name consistently; do not create a parallel change type.                                                                                                               |
| map maintenance summary   | `NitroMapMaintenanceSummary`     | none initially                 | UI-local rollup of Cartographer status and recent map reconciliation actions. Future contracts may derive it from `NitroMapReconciliationAction` records.                       |
| work episode              | `NitroWorkEpisodeSummary`        | `NitroWorkEpisode`             | Separate work object attached to a project conversation. Many episodes may share the same conversation thread during preparation.                                               |
| work round                | `NitroWorkRoundSummary`          | `NitroWorkRound`               | One deterministic cycle inside an episode. Nitro submit starts the first round; round completion inserts a compact `system` result message into the main conversation.          |
| round trace               | `NitroRoundTrace`                | `NitroOwnershipTrace`          | Round-scoped execution graph from concrete ownership-agent invocations. It is not a global activity item.                                                                       |
| agent invocation          | `NitroAgentInvocation`           | `NitroOwnershipAgentResponse`  | Concrete inference/run of an ownership agent during one round. Distinct from the persistent ownership agent definition on the project map.                                      |

During preparation, `NitroOwnershipEdge` means a rendered or projected resource-ownership relationship. It must not be used for management hierarchy. The final ownership model uses `SupervisionEdge` for "agent response wakes supervising management agent" relationships, and future contracts should keep that hierarchy separate from visual resource-match edges.

The vision document uses concise model names such as `OwnershipMap`, `OwnershipAgent`, `FileResponsibility`, `SupervisionEdge`, `OwnershipTrace`, and `MapReconciliationAction`. Preparation and future package contracts use Nitro-prefixed names for the same domain concepts where they cross UI or package boundaries. Do not treat the prefix difference as a separate model.

## UI Shell Changes

The current `AppSidebarLayout` should not remain the main product frame long term. It is thread-sidebar-first.

Introduce a new authenticated app shell for NitroMap routes. During preparation, this should be a route-branch layout rather than a global replacement. Existing settings, pairing, websocket status, command palette hooks, and global shortcuts should stay shared through common providers above both layouts.

The NitroMap shell hierarchy should be:

- persistent project switcher
- primary navigation: map, work, Map Maintenance
- secondary utilities: settings, provider/environment status, command palette entry points
- right-side or contextual panels: map inspector, round/trace inspector, Map Maintenance action detail

Navigation contract:

| Surface                  | Route                                                 | Primary content                                                 | Active state                             | Project switch behavior                                                                                                                                          |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map                      | `/projects/$environmentId/$projectId/map`             | ownership map, inspector, compact work summary                  | active on map route                      | stay on map for the newly selected project                                                                                                                       |
| Work                     | `/projects/$environmentId/$projectId/work`            | active/recent episodes, rounds, and concrete round trace graphs | active on work list or work detail route | show that project's work list                                                                                                                                    |
| Work detail              | `/projects/$environmentId/$projectId/work/$episodeId` | episode rounds, selected round graph, and transcript action     | active under Work                        | if episode is missing in new project, fall back to that project's work list                                                                                      |
| Map Maintenance          | `/projects/$environmentId/$projectId/map-maintenance` | read-only map reconciliation actions and disabled mock controls | active on map maintenance route          | show that project's map reconciliation actions                                                                                                                   |
| Transcript compatibility | `/$environmentId/$threadId`                           | existing full thread experience                                 | outside NitroMap primary nav             | link back to `/projects/$environmentId/$projectId/work/$episodeId` when a validated owning episode is known, otherwise `/projects/$environmentId/$projectId/map` |

Early implementation can keep the existing sidebar component primitives, but not the existing thread-sidebar information architecture. The user should not experience the product as "pick a thread to continue." They should experience it as "open a project map, then inspect or start work."

The empty state should become project/map oriented:

- no selected project
- project has no generated mock map yet
- map data loading
- map data unavailable
- active work unavailable

Avoid threading "No active thread" language through new surfaces.

State behavior should be explicit:

- no selected project: show project picker and keep global navigation available
- project has no generated mock map yet: offer deterministic mock-map creation or reload from mock data source
- map data loading: show stable shell and skeleton map placeholders
- map data unavailable: show retry action and link back to project selection
- active work unavailable: keep map usable and show an empty work panel
- offline or reconnecting: keep last known map visible with a connection status indicator
- permission or missing project: show a project-scoped error and do not fall back to an arbitrary thread

Desktop should use a concrete default layout:

- left rail: project switcher and primary navigation
- center: map canvas or route-specific primary content
- right stack: inspector first, Map Maintenance summary below it when present
- bottom or right-adjacent work strip: compact active/blocking work summary

Tablet and narrow desktop should collapse the right stack into a drawer while keeping the work strip visible. Mobile should use top-level tabs for map/list, work, and Map Maintenance. The spatial map may move behind a tab, but the searchable resource list and blocking work summary must remain one tap away. If multiple drawers could open, blocking work outranks inspector, and inspector outranks Map Maintenance history.

Selection behavior:

- selecting a resource opens the inspector with resource identity, matched responsibilities, and owning agents
- selecting an agent opens the inspector with agent kind, responsibilities, and visible resource matches
- selecting a responsibility opens query details and all current resource matches
- selecting an ownership edge explains why that agent owns that resource for that responsibility
- selecting an intervention opens the intervention detail and related work episode if present
- selecting a map reconciliation action opens before/after ownership context when mocked data provides it
- selecting a work episode opens the compact work detail, with an action to open the transcript route

Only one primary inspector selection should be active at a time. Work blocking states outrank ordinary selection in the work panel, but should not clear the user's map selection. Selection state should be local to the project route at first and does not need to survive a full page reload.

Selection state should use one explicit shape:

```ts
type NitroMapSelection =
  | { kind: "resource"; resourceId: string }
  | { kind: "agent"; agentId: string }
  | {
      kind: "agent-instance";
      instanceId: string;
      agentId: string;
      responsibilityId: string;
      resourceId?: string;
    }
  | { kind: "responsibility"; responsibilityId: string }
  | { kind: "edge"; edgeId: string }
  | { kind: "intervention"; interventionId: string }
  | { kind: "map-reconciliation-action"; actionId: string }
  | { kind: "work-episode"; episodeId: string };
```

Pointer click, keyboard focus activation, and search-result activation should all set this same selection object. Edges need a selectable hit target larger than the visible line. Repeated abstract-agent visual instances should select `agent-instance`, not duplicate canonical agents.

The vision document's "scope details" surface maps to responsibility selection in the inspector during preparation. Do not add a separate scope-detail route unless later interaction requirements prove the inspector is insufficient.

## Route Preparation

Create route concepts that can support NitroMap without breaking existing thread routes.

Canonical preparation route shape:

- `/projects/$environmentId/$projectId/map`
- `/projects/$environmentId/$projectId/work`
- `/projects/$environmentId/$projectId/work/$episodeId`
- `/projects/$environmentId/$projectId/map-maintenance`

Work episodes are project-scoped in routes. `episodeId` must remain distinct from `threadId` because the same conversation thread can launch many work episodes. The route must carry `projectId` so ownership, navigation, and fallback behavior stay unambiguous.

Agents and activity are not separate top-level routes in the current plan. Persistent agent definitions belong on the Map and inspector. Runtime activity belongs under Work as episode rounds and round traces.

A transitional work episode must include:

```ts
interface NitroWorkEpisodeSummary {
  episodeId: string;
  environmentId: string;
  projectId: string;
  /**
   * Main-agent conversation that launched the episode. Many episodes may share
   * the same conversation thread in the preparation bridge.
   */
  conversationThreadId: string;
  /**
   * User message or composer submission that created the episode.
   */
  startedFromMessageId: string;
  /**
   * Null through Milestone 4 mock-only episodes. Set only after the adapter has
   * validated the execution thread in Milestone 5 or later. During preparation
   * this is usually the same physical thread as `conversationThreadId`, but UI
   * code should treat it as adapter plumbing rather than product identity.
   */
  backingThreadId: string | null;
  title: string;
  status: "idle" | "running" | "blocked" | "failed" | "completed" | "aborting" | "aborted";
  mainAgent: {
    /**
     * Per-episode main-agent identity/state reference. This is not a project-global
     * current agent.
     */
    mainAgentId: string;
    state:
      | "idle"
      | "running"
      | "waiting-for-ownership"
      | "waiting-for-user"
      | "aborting"
      | "aborted";
  };
  blockingItems: NitroWorkBlockingItem[];
  createdAt: string;
  updatedAt: string;
  transcriptRoute: string | null;
  rounds: NitroWorkRoundSummary[];
}

interface NitroWorkRoundSummary {
  id: string;
  episodeId: string;
  index: number;
  status: "running" | "waiting" | "blocked" | "failed" | "completed" | "aborting" | "aborted";
  title: string;
  startedByUserMessage: string;
  /**
   * Id of the compact system result message inserted into the main conversation.
   * Detailed episode, round, trace, and invocation state lives under Work.
   */
  resultMessageId: string | null;
  startedAt: string;
  completedAt: string | null;
  traces: NitroRoundTrace[];
}

interface NitroRoundTrace {
  id: string;
  roundId: string;
  title: string;
  status: "pending" | "injected" | "failure-injected" | "aborted" | "failed";
  rootInvocationId: string;
  invocationIds: string[];
}

interface NitroAgentInvocation {
  id: string;
  roundId: string;
  traceId: string;
  agentId: string;
  parentInvocationId: string | null;
  trigger: "file-match" | "supervision-response" | "manual";
  status: "queued" | "running" | "responded" | "no-response" | "failed" | "aborted";
  summary: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

`aborting` is transient while the adapter is stopping the active provider turn or pending ownership phases. `aborted` means the active turn stopped by user request. Aborting is idempotent: a second abort for the same active turn should leave the episode in `aborting` or `aborted`, not create a new failure. If an approval or user-input blocker is visible while abort wins the race, the blocker is cleared or marked stale for that episode rather than submitted.

Creating or resuming work may still dispatch existing thread creation and `thread.turn.start` commands. That behavior should be hidden behind a work-episode adapter so NitroMap components do not call thread APIs directly.

`backingThreadId` is adapter-only and may be `null` for mock-only Milestone 2-4 episodes. NitroMap labels, route helpers, and visible identities should use `episodeId`. `transcriptRoute` may contain the backing thread id as an href target only after the mapping is validated, but the UI must not render that id as the product identity.

Startup and compatibility rules:

- first launch should prefer the most recent accessible project map when project data exists
- if bootstrap returns both `bootstrapProjectId` and `bootstrapThreadId`, route to the project map and expose the thread as a known conversation; show an active work episode only when a validated episode mapping exists
- if only a thread is known, route to `/$environmentId/$threadId`
- if a project route references a missing project, show a project error rather than opening an unrelated thread
- `/$environmentId/$threadId` remains the canonical compatibility transcript URL during preparation and should not be removed
- deep transcript links should point to `/$environmentId/$threadId` until a real work-episode transcript route exists

The current `_chat` route group is pathless; do not introduce a literal `/_chat/...` product URL unless it is only a redirect to the existing transcript URL.

Work flow during preparation:

- `Start work` appears in the compact work panel and on the `/work` route.
- In Milestones 3-4, `Start work` is visible as a disabled, non-interactive affordance. It must not open a composer, create a mock episode, mutate state, call the adapter, or create/link threads.
- Milestone 5 is the first milestone where Nitro submit may create/link backing execution state and dispatch `thread.turn.start` through the work-episode adapter.
- In Milestone 5, episode creation comes from the Nitro composer button in the conversation, not from a second independent Work prompt flow. A Work-surface `Start work` affordance should route or focus the user toward the current conversation composer/Nitro path until a separate prompt design is intentionally specified.
- The composer should display a project-map icon adjacent to the Nitro button. That icon is informational navigation/context, while the Nitro button remains the episode-start action.
- Nitro submit requires a project ownership map. If the Cartographer has not yet run for the project, the Nitro button must be disabled and its hover text should tell the user to run the Cartographer first.
- A successful Milestone 5 Nitro submit routes or deep-links to `/projects/$environmentId/$projectId/work/$episodeId`, sets Work active when opened, and shows the new work episode detail. If creation/linking fails or the episode mapping cannot be validated, the user remains on the current route with a project-scoped error and no unrelated thread opens.
- `/work` lists active, blocked, and recent episodes for the project.
- `/work/$episodeId` shows compact work detail, blocking items, changed-resource summaries when available, and an open-transcript action only when `transcriptRoute` is non-null.
- If no active episode exists, the work panel shows the start-work entry point rather than opening an empty transcript.
- While a Nitro episode is running for a conversation, regular submit and Nitro submit in that conversation should be blocked or disabled. Abort remains available from the conversation/work UI.

## Mock Domain Layer

Create a small mock NitroMap domain layer before building the UI.

The mock layer should define a concrete replaceable interface:

```ts
interface NitroMapDataSource {
  getProjectView(ref: NitroProjectRef): Promise<NitroMapProjectViewState>;
  getWorkEpisodes(ref: NitroProjectRef): Promise<NitroWorkEpisodeSummary[]>;
  getOwnershipTraces(ref: NitroProjectRef, episodeId: string): Promise<NitroOwnershipTrace[]>;
  getMapReconciliationActions(ref: NitroProjectRef): Promise<NitroMapReconciliationAction[]>;
}

interface NitroProjectRef {
  environmentId: string;
  projectId: string;
}

interface NitroMapProjectView {
  projectId: string;
  environmentId: string;
  map: NitroMapSnapshot;
  layout: NitroMapLayout;
  workEpisodes: NitroWorkEpisodeSummary[];
  /**
   * Foreground work episode for the compact work panel. A project may have
   * multiple running or blocked episodes; this is not a uniqueness constraint.
   */
  foregroundWorkEpisodeId: string | null;
  runningWorkEpisodeIds: string[];
  mapMaintenance: NitroMapMaintenanceSummary;
}

type NitroMapProjectViewState =
  | { state: "loading"; ref: NitroProjectRef }
  | { state: "ready"; view: NitroMapProjectView; version: string }
  | {
      state: "stale-ready";
      view: NitroMapProjectView;
      version: string;
      reason: "offline" | "reconnecting";
    }
  | { state: "empty-map"; ref: NitroProjectRef; message: string }
  | { state: "missing-project"; ref: NitroProjectRef }
  | { state: "permission-denied"; ref: NitroProjectRef; message: string }
  | { state: "unavailable"; ref: NitroProjectRef; message: string; retryable: boolean };

interface NitroMapSnapshot {
  resources: NitroResource[];
  agents: NitroOwnershipAgent[];
  responsibilities: NitroResponsibility[];
  edges: NitroOwnershipEdge[];
  supervisionEdges: NitroSupervisionEdge[];
  interventions: NitroIntervention[];
  mapReconciliationActions: NitroMapReconciliationAction[];
}

interface NitroMapLayout {
  resourceNodes: NitroResourceNode[];
  agentInstances: NitroAgentInstance[];
}

interface NitroMapMaintenanceSummary {
  cartographerStatus: "mocked" | "unimplemented" | "ready" | "running" | "failed";
  latestActionIds: string[];
  disabledReason?: string;
}

interface NitroResource {
  resourceId: string;
  kind: "file" | "folder" | "generated-asset" | "remote-resource" | "logical-component";
  label: string;
  path?: string;
  description?: string;
}

interface NitroOwnershipAgent {
  agentId: string;
  type: "implementation" | "management";
  name: string;
  purpose: string;
  status: "active" | "stale" | "disabled";
}

interface NitroResponsibility {
  responsibilityId: string;
  agentId: string;
  title: string;
  kind: "file-scope" | "resource-scope" | "ui-derived-management-scope";
  query?: NitroResponsibilityQuery;
  resourceIds: string[];
  rationale: string;
  confidence: number;
}

interface NitroOwnershipEdge {
  edgeId: string;
  agentId: string;
  responsibilityId: string;
  resourceId: string;
  rationale: string;
}

interface NitroResourceNode {
  nodeId: string;
  resourceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NitroIntervention {
  interventionId: string;
  episodeId?: string;
  sourceAgentId: string;
  severity: "info" | "warning" | "blocking";
  title: string;
  summary: string;
  relatedResourceIds: string[];
  relatedResponsibilityIds: string[];
  createdAt: string;
}

interface NitroMapReconciliationAction {
  actionId: string;
  kind:
    | "agent-created"
    | "agent-updated"
    | "agent-deleted"
    | "responsibility-updated"
    | "supervision-updated";
  summary: string;
  targetIds: string[];
  createdAt: string;
}
```

This does not need to be the final contract. It should be good enough to shape component boundaries.

Mock data should be deterministic, small, and testable. It should not be generated randomly in render paths. It should be generated from `environmentId + projectId` so multiple projects do not share one global mock map accidentally.

The mock layer should support at least:

- one map per project ref with resource nodes
- several implementation agents
- several management agents
- mocked supervision edges showing which management agents supervise which implementation or management agents
- repeated visual instances of abstract agents
- mocked responsibility queries
- mocked active and recent work episodes
- mocked interventions
- mocked map reconciliation actions

Non-abstract responsibilities must include a query. The query is not executable yet, but it must describe which concrete resources are meant. These preparation query definitions are display/prototype shapes for mock data and future read models; they are not permission to build a broad V1 executable evaluator. The first executable runtime should still start with file/path responsibility matching.

```ts
interface NitroResponsibilityQuery {
  queryId: string;
  description: string;
  definition:
    | { kind: "path-glob"; glob: string; base: "project-root" }
    | { kind: "path-set"; paths: string[]; base: "project-root" }
    | {
        kind: "resource-kind";
        resourceKind:
          | "file"
          | "folder"
          | "generated-asset"
          | "remote-resource"
          | "logical-component";
      }
    | { kind: "remote-resource"; provider: string; remoteIds: string[] }
    | { kind: "derived"; source: "mock" | "future-indexer"; description: string };
}

interface NitroAgentInstance {
  instanceId: string;
  agentId: string;
  responsibilityId: string;
  resourceId?: string;
  layoutGroupId: string;
}

interface NitroSupervisionEdge {
  edgeId: string;
  supervisorAgentId: string;
  childAgentId: string;
  status: "active" | "stale" | "disabled";
  rationale: string;
}

interface NitroOwnershipTrace {
  traceId: string;
  episodeId: string;
  rootAgentId: string;
  responseIds: string[];
  status: "pending" | "injected" | "failure-injected" | "aborted" | "failed";
  injection:
    | { mode: "none" }
    | { mode: "raw"; injectedAt: string }
    | { mode: "consolidated"; consolidationId: string; injectedAt: string }
    | { mode: "failure"; failureTraceId: string; injectedAt: string };
  abortReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface NitroWorkBlockingItem {
  blockingItemId: string;
  kind: "approval" | "user-input" | "failed-turn" | "diff-review" | "terminal-attention";
  severity: "info" | "needs-action" | "failed";
  sourceThreadEventId?: string;
  primaryAction:
    | "respond-inline"
    | "open-approval"
    | "open-input"
    | "retry"
    | "open-diff"
    | "open-terminal"
    | "open-transcript";
  secondaryAction?: "open-transcript";
  description: string;
}
```

Management-agent scope is represented by `NitroOwnershipAgent.purpose` plus `NitroSupervisionEdge` in the preparation model, matching the vision document's V1 model. `NitroResponsibility` should be concrete and query-backed when it represents ownership of resources. A `ui-derived-management-scope` responsibility may exist only as a read-model helper for rendering or inspector grouping; it is not a durable abstract management responsibility.

Mocked map maintenance affordances must not look like live controls:

- `Run map reconciliation` may be visible but disabled, with copy that says real Cartographer recomputation is not implemented in the preparation phase.
- Map reconciliation action rows are read-only.
- Selecting a map reconciliation action may update the inspector with mocked before/after responsibility or ownership context.
- Mocked map reconciliation actions must not show success toasts, mutation progress, or optimistic updates.
- Ownership changes should be represented as fields inside `NitroMapReconciliationAction`, not as a separate domain type.

## Component Structure

Prefer splitting NitroMap UI by domain and surface, not by visual accident.

Candidate frontend structure:

- `apps/web/src/nitromap/types.ts`
- `apps/web/src/nitromap/mockData.ts`
- `apps/web/src/nitromap/selectors.ts`
- `apps/web/src/nitromap/routes/`
- `apps/web/src/nitromap/components/NitroMapShell.tsx`
- `apps/web/src/nitromap/components/NitroMapCanvas.tsx`
- `apps/web/src/nitromap/components/NitroResourceNode.tsx`
- `apps/web/src/nitromap/components/NitroAgentBadge.tsx`
- `apps/web/src/nitromap/components/NitroWorkPanel.tsx`
- `apps/web/src/nitromap/components/NitroMapMaintenancePanel.tsx`
- `apps/web/src/nitromap/components/NitroInspectorPanel.tsx`

Keep component responsibilities narrow:

- shell handles layout
- canvas handles spatial map rendering
- resource nodes render resources
- agent badges render agent identity and local ownership role
- work panel summarizes active work
- map maintenance panel shows disabled recompute affordance and map reconciliation actions
- inspector panel explains selected resources, agents, and responsibilities

Avoid creating another `ChatView`-sized component.

Frontend state should be integrated through a small NitroMap boundary, not ad hoc component imports. During preparation, components should consume a project-scoped view from `NitroMapDataSource`. Later, that boundary can be backed by RPC or route loader data. Store keys and selectors should be scoped by `{ environmentId, projectId }`.

## Canvas Dependency Decision

There is no dedicated graph/canvas dependency in the web app today.

For the preparation phase, use the simplest approach that proves the product structure:

- CSS grid or absolute-positioned HTML for the first mocked map
- SVG only for lightweight connecting lines if needed
- no physics simulation
- no automatic graph layout requirement

A real graph/canvas library can be chosen later when interaction requirements are clearer. Early dependency choices should not lock the product into the wrong mental model.

When the map becomes more interactive, evaluate:

- pan and zoom needs
- node count
- edge count
- drag behavior
- virtualization needs
- accessibility
- screenshot/test stability
- bundle cost

Even in the mocked HTML/SVG phase, the map should have a non-spatial inspection path. Search, keyboard focus, readable labels, and a list-style resource/agent view can be minimal, but the user should not be forced to use spatial dragging or precise pointer targeting to inspect ownership.

## Conversation Demotion

Do not delete thread functionality during preparation.

Instead:

- keep current thread execution plumbing
- expose validated work episodes as compact Work entries and keep their conversation thread as adapter plumbing
- show only high-value summaries in the NitroMap shell
- keep full message timeline behind a detail route, drawer, or "open transcript" action
- preserve existing approval, pending input, diff, and terminal functionality while gradually moving controls into work-episode panels

The preparation phase should make long chat history non-primary without breaking provider workflows.

Each project can have multiple conversations. They share the same project ownership map, but each one has its own user-facing main agent state, backing thread during preparation, transcript, and active-turn lifecycle. Each conversation can launch many work episodes over time. NitroMap components must not treat the project as having one global current main agent, and they must not treat a conversation id as the episode id.

After the user starts an episode with Nitro submit, the normal NitroMap flow should not require the user to manually coordinate ownership agents. Ownership traces are injected into the main agent's context automatically when that behavior exists. Round completion inserts a compact `system` result message into the main conversation with deep links to the episode and round details. The Work UI presents the trace details, ordered by trace creation and injection status, while keeping the main conversation lean. Trace entries should identify the root ownership agent, response chain, current status, and whether the main agent received raw, consolidated, failure, or no injected context.

The user must be able to abort an active work episode turn. Abort should stop the current turn and pending ownership phases for that work episode, keep the user in the project-scoped NitroMap surface, and leave already persisted messages, traces, and the shared ownership map inspectable.

Blocking provider workflows must remain first-class:

- pending approval appears as a blocking item in the compact work panel
- pending user input appears as a blocking item with a clear action to respond
- failed provider turns appear in the work panel with retry/open-transcript actions
- diffs and terminal output remain reachable from the work episode detail
- opening a transcript should not be required just to notice that work is blocked

The NitroMap UI should not duplicate send-turn logic. Work episode actions should call a shared adapter that delegates to the existing thread execution path during preparation.

Preparation-phase work adapter:

```ts
interface NitroWorkEpisodeAdapter {
  startWork(input: {
    environmentId: string;
    projectId: string;
    conversationThreadId: string;
    startedFromMessageId: string;
    prompt: string;
    selectedResourceIds?: string[];
    selectedResponsibilityIds?: string[];
  }): Promise<NitroWorkEpisodeSummary>;
  resumeWork(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
  }): Promise<NitroWorkEpisodeSummary>;
  sendTurn(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    prompt: string;
  }): Promise<void>;
  respondToApproval(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    blockingItemId: string;
    /**
     * Delegates to the existing provider approval decision contract.
     */
    decision: "accept" | "acceptForSession" | "decline" | "cancel";
  }): Promise<void>;
  respondToUserInput(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    blockingItemId: string;
    /**
     * Delegates to the existing user-input answer contract.
     */
    answers: Record<string, string | string[]>;
  }): Promise<void>;
  retryTurn(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    blockingItemId: string;
  }): Promise<void>;
  abortTurn(input: { environmentId: string; projectId: string; episodeId: string }): Promise<void>;
  getDiffDetail(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    blockingItemId: string;
  }): Promise<NitroDiffDetailRef>;
  getTerminalDetail(input: {
    environmentId: string;
    projectId: string;
    episodeId: string;
    blockingItemId: string;
  }): Promise<NitroTerminalDetailRef>;
  openTranscript(input: { environmentId: string; projectId: string; episodeId: string }): string;
}

interface NitroDiffDetailRef {
  backingThreadId: string;
  kind: "thread-diff" | "turn-diff" | "checkpoint-diff";
  sourceId?: string;
}

interface NitroTerminalDetailRef {
  backingThreadId: string;
  terminalId?: string;
  sessionStatus?: "starting" | "running" | "exited" | "error";
}
```

`sendTurn` is an adapter-internal episode/round action, not the regular composer submit path. Enter and the regular send button continue to use the existing main-agent message flow, and only when no Nitro episode is running for that conversation.

During preparation, the authoritative episode-to-conversation mapping lives in the work-episode adapter/read boundary. It is keyed by `{ environmentId, projectId, episodeId }` and resolves to `conversationThreadId`, `startedFromMessageId`, and validated execution plumbing such as `backingThreadId`. Many episodes may resolve to the same `conversationThreadId`. Milestones 2-4 mock episodes should use `backingThreadId: null` and `transcriptRoute: null` rather than inventing fake thread identities. Milestone 5 must read the mapping from existing thread/project state or a clearly named mock/experimental bridge for adapter-backed tests. Adapter mutations must validate that the episode belongs to the supplied project and conversation before dispatching thread commands.

Missing, ambiguous, or unproven episode mappings must fail closed with a project-scoped missing/unavailable episode state. The adapter must never infer a conversation thread or backing thread from route params, the globally active/current thread, recency, display labels, or a matching title.

During preparation, the adapter may wrap existing orchestration RPC/commands and client/server services for thread turn start, approval response, user-input response, thread detail subscription, turn diff access, and terminal access. It must not bypass these boundaries by talking directly to provider managers or app-server internals. Every thread API call must happen after `{ environmentId, projectId, episodeId }` has been resolved to a validated `backingThreadId`.

Work panel action contract:

| Blocking item kind   | Priority | Primary action                                        | Secondary action | Transcript required |
| -------------------- | -------- | ----------------------------------------------------- | ---------------- | ------------------- |
| `approval`           | 1        | approve/reject from the work panel or approval drawer | open transcript  | no                  |
| `user-input`         | 2        | respond from the work panel or input drawer           | open transcript  | no                  |
| `failed-turn`        | 3        | retry or open failure detail                          | open transcript  | no                  |
| `diff-review`        | 4        | open diff                                             | open transcript  | no                  |
| `terminal-attention` | 5        | open terminal drawer/detail                           | open transcript  | no                  |

When several episodes are blocked, sort by the highest-priority blocking item, where lower numeric priority wins, then by most recently updated episode.

Blocking item UI destinations:

- Approval opens an approval drawer or inline work-panel section with approve/reject actions. Submitting returns to the same NitroMap route and updates the work episode state.
- User input opens an input drawer or inline work-panel section with a response composer. Submitting returns to the same NitroMap route and updates the work episode state.
- Failed turn opens a failure detail drawer with retry and transcript actions. Retry stays in the NitroMap work route unless the user explicitly opens transcript.
- Diff review opens a NitroMap work-detail diff drawer or panel backed by the existing diff APIs. It may reuse existing diff components, but it must be hosted inside the NitroMap work surface rather than routing through `ChatView`.
- Terminal attention opens a NitroMap work-detail terminal drawer or panel backed by the existing terminal APIs. It may reuse existing terminal components, but it must be hosted inside the NitroMap work surface rather than routing through `ChatView`.
- Open transcript is the explicit escape hatch to `/$environmentId/$threadId`; no blocking primary action should require this route.

## Removal And Replacement Boundaries

Preparation should remove the thread-first product shape from NitroMap surfaces, not delete the execution machinery that still makes provider work reliable.

Remove or stop using these for NitroMap routes:

- `AppSidebarLayout` as the wrapper for `/projects/$environmentId/$projectId/...` routes.
- Thread sidebar information architecture as the primary navigation for project work.
- "Pick a thread" or "No active thread" language in NitroMap surfaces.
- Raw `threadId` as visible product identity, labels, headings, breadcrumbs, or route helper names in NitroMap UI.
- Direct calls from NitroMap components to thread send-turn/start-turn APIs.
- Mock NitroMap objects embedded inside React components.
- Chat timeline as the center surface of project work.

Keep these during preparation:

- provider sessions keyed by `threadId`
- current thread execution path
- `ChatView` as the compatibility transcript/detail surface
- `/$environmentId/$threadId` deep links
- approvals, pending input, diffs, terminal output, and failure handling
- existing settings, pairing, websocket status, and command palette providers

Replace with these boundaries:

- NitroMap route-branch shell for project routes
- `NitroMapDataSource` for project map/read data
- `NitroWorkEpisodeAdapter` for all work actions that still delegate to thread plumbing
- `NitroMapSelection` for map/list/inspector selection
- project-scoped work routes instead of thread selection as the normal path
- transcript links as explicit detail actions, not default navigation

The current root route wraps authenticated surfaces in `AppSidebarLayout`. The implementation must explicitly break that coupling for NitroMap routes. Either move `AppSidebarLayout` down into the legacy transcript/chat route branch, or introduce an authenticated frame that chooses `NitroMapShell` or `AppSidebarLayout` by route branch. Auth, websocket status, command palette, toast, pairing, settings providers, and environment providers should stay above both shells.

An implementation should not remove old thread files just because a NitroMap replacement exists. A thread-oriented file should be removed only when no compatibility transcript path, provider workflow, or legacy route still depends on it. Until then, move usage behind NitroMap adapters or route boundaries.

## Server And Contracts Preparation

Avoid adding fake backend behavior too early. For the first UI preparation, frontend mocks are acceptable.

However, shape the frontend mock types so they can later move into `packages/contracts` as schemas.

When backend preparation begins, add new contracts and projections rather than overloading thread fields:

- `NitroMapProjectSnapshot`
- `NitroOwnershipAgent`
- `NitroResponsibility`
- `NitroResponsibilityQuery`
- `NitroResource`
- `NitroOwnershipEdge`
- `NitroSupervisionEdge`
- `NitroIntervention`
- `NitroMapReconciliationAction`
- `NitroOwnershipAgentResponse`
- `NitroOwnershipTrace`
- `NitroTraceConsolidation`
- `NitroRoundPacket`
- `NitroWorkEpisode`

Use `NitroOwnershipEdge` only for resource-match/read-model edges that make ownership visible in the map. Use `NitroSupervisionEdge` for management hierarchy and wake behavior. A single management agent can have multiple supervision edges to implementation agents, management agents, or both. Do not collapse these into one edge type; they answer different questions and match the vision document's distinction between resource ownership and supervision.

Do not encode ownership agents as special threads. That would preserve the wrong architecture.

Provider sessions may remain keyed by `threadId` until a real work-episode aggregate exists. The important preparation step is to stop exposing `threadId` as the product-level identity in new UI.

When contracts are introduced, prefer a NitroMap-specific read boundary rather than overloading existing thread details. Candidate methods:

- `nitromap.getProjectSnapshot`
- `nitromap.subscribeProject`
- `nitromap.getWorkEpisode`

These should define sequence/version fields and reconnect behavior. If the existing orchestration replay stream is reused, document exactly how NitroMap project events join the current project/thread aggregate model.

Subscription contract default:

- `nitromap.subscribeProject` should emit one initial snapshot followed by ordered project updates.
- `sequence` should be the existing global orchestration sequence if NitroMap events share the current event log.
- `projectVersion` should be project-local and increment for each NitroMap project update.
- Subscribe input should accept `{ environmentId, projectId, lastSequence?, lastProjectVersion? }`.
- Each update envelope should include `{ environmentId, projectId, sequence, projectVersion, snapshot? | patch? }`.
- On a fresh subscription, the server emits a snapshot envelope first.
- On reconnect with cursors, the server may replay missed project updates when available; if it cannot prove continuity, it must emit a fresh snapshot envelope instead of relying on the client to infer correctness.
- A filtered project stream should not treat unrelated global events as client-visible gaps. Gap detection is based on project update continuity; global sequence is retained for ordering and diagnostics.
- If the client receives a discontinuity marker or incompatible version, it should request a fresh `nitromap.getProjectSnapshot` before applying more updates.

Candidate durable event names for later backend work:

- `nitromap.resource-upserted`
- `nitromap.resource-removed`
- `nitromap.responsibility-upserted`
- `nitromap.responsibility-assigned`
- `nitromap.responsibility-unassigned`
- `nitromap.map-reconciliation-action-recorded`
- `nitromap.intervention-recorded`
- `nitromap.work-episode-linked`

Default aggregate rule for future backend work:

- map ownership events use `aggregateKind: "nitromap-project"` and `aggregateId: environmentId + ":" + projectId` unless `projectId` is later proven globally unique
- every NitroMap event includes `environmentId` and `projectId`
- work-episode link events include `environmentId`, `projectId`, `episodeId`, and `backingThreadId`
- provider execution events may remain on the existing thread aggregate until a durable work-episode aggregate exists
- NitroMap subscriptions should join project-scoped NitroMap events with thread-derived work summaries through projections, not by storing ownership state on thread aggregates

Backend preparation must distinguish source of truth from projection:

- resources may begin as derived workspace/git/project data
- responsibilities and assignments should become durable source-of-truth records
- ownership edges may be projections of responsibility queries over resources
- supervision edges should be durable management-hierarchy records when backend ownership behavior begins
- interventions are ownership-agent or work-episode feedback that should be surfaced in the map/work UI
- provider activity, git/diff signals, and map reconciliation actions may feed intervention detection later, but they should remain separate records unless they produce ownership-agent/work-episode feedback
- work episodes are transitional records mapped to conversation/execution threads until a durable work-episode aggregate exists

Any seeded or fake backend data must be clearly named `mock` or `experimental`, must not be exposed as production behavior by default, and must include a removal or migration path.

## Quality Conventions To Preserve

New code should follow the existing repo's strongest conventions:

- contracts are schema-first and live in `packages/contracts`
- shared runtime logic belongs in `packages/shared` only when used by multiple packages
- `packages/shared` should use explicit subpath exports, not a barrel index
- server state changes should be event-sourced where they affect durable product state
- frontend state should normalize large collections and use selectors rather than passing giant objects through the tree
- rendering-heavy surfaces should keep stable references and avoid recomputing large derived arrays in render
- async server work should use queue-backed workers or explicit services when ordering matters
- persistence should use migrations, repositories, and projection services rather than ad hoc database access
- browser components should separate pure logic into testable `.logic.ts` files when behavior gets non-trivial
- UI state should be compact, deterministic, and testable
- avoid large all-owning components

New NitroMap code should also add its own conventions:

- map data and visual layout data are separate concepts
- mocked data lives outside components
- every mock should represent a future real domain concept
- resource identity should not be a display label
- ownership assignment should point to responsibility ids, not directly to labels
- responsibility queries should be visible in data even if not yet executable
- worktree references are execution context only, not owned resources

Resource identity rules:

- resource ids must be stable and not derived from display labels
- file and folder resources should use canonical paths relative to the project repository root when possible
- branch and worktree names are execution context and should not change resource identity by themselves
- generated assets may be resources when they are meaningful ownership targets, but must be marked as generated
- remote resources must include provider, remote id, and display URL or lookup metadata
- logical components may be resources only when their query explains how concrete files/resources are matched
- renames should be modeled as identity-preserving when the underlying project can prove continuity, otherwise as remove plus add
- ownership can target files, folders, generated assets, remote resources, or logical components, but not a whole worktree

## Testing Expectations

The preparation phase should still add tests where they protect seams.

Good early tests:

- mock data validates against local TypeScript types
- selectors derive map nodes and repeated agent instances predictably
- route helpers build NitroMap routes without exposing chat routes
- work panel summarization hides long transcripts by default
- map reconciliation action list renders deterministic rows
- selection logic opens the correct resource, agent, or responsibility detail

Avoid expensive browser tests until the component structure settles, but add browser coverage once the map shell becomes the default project view.

Every implementation milestone must pass the repo gates:

- `bun fmt`
- `bun lint`
- `bun typecheck`

Relevant milestone tests must pass via `bun run test`. Never use `bun test`.

Milestones with browser e2e gates must also pass the documented browser command, for example `bun run test:e2e` once that script exists. Do not use `bun test` for browser or unit tests.

Milestone-specific unit and integration tests should include:

- Milestone 2: mock data and selector tests
- Milestone 3: route helper tests and project-scoped mock loading tests
- Milestone 4: selection and panel-precedence tests
- Milestone 5: work episode adapter tests proving send-turn logic is not duplicated
- Milestone 6: bootstrap/deep-link behavior tests
- Milestone 7: schema validation tests
- Milestone 8: migration/projection tests when tables are added

## E2E Regression Strategy

Add browser e2e coverage when the project map route first becomes reachable in Milestone 3, starting with a narrow route/shell smoke test. Expand coverage in Milestone 4 when the full NitroMap shell becomes user-visible. Use the repo's existing browser test convention if one exists at implementation time only if it can cover app-level routing, authenticated shell behavior, server welcome/bootstrap, websocket orchestration streams, and deep links. Otherwise introduce Playwright with a minimal fixture strategy. These tests should be stable, deterministic, and mock-backed until real NitroMap data exists.

The required harness shape is:

- mounted app router with authenticated state
- mocked or fixture-backed environment/project bootstrap
- injectable `NitroMapDataSource`
- mocked orchestration shell/thread streams for route and work-panel states
- mocked transcript compatibility target for `/$environmentId/$threadId`
- optional provider/session stubs only after Milestone 5

Milestone 4 e2e must not require a live provider or real server process unless the harness explicitly stubs provider/session behavior.

The e2e suite should protect product-level behavior rather than visual details. It should verify:

- direct navigation to `/projects/$environmentId/$projectId/map` renders the map shell in Milestone 4
- authenticated startup routes to `/projects/$environmentId/$projectId/map` when project data exists in Milestone 6 and later
- legacy `/$environmentId/$threadId` deep links still open the transcript/detail surface
- the map route renders the NitroMap shell, map/list surface, work summary, map maintenance summary, and inspector
- NitroMap project routes render NitroMap shell landmarks and primary nav items
- NitroMap project routes do not render thread list, thread search, or new-thread controls anywhere in the route shell
- no NitroMap surface shows `No active thread` or raw `threadId` identity text
- selecting a resource updates the inspector with ownership and responsibility details
- selecting an agent or repeated abstract-agent instance resolves to canonical agent plus responsibility context
- selecting a responsibility shows its query definition and current resource matches
- selecting an ownership edge, intervention, map reconciliation action, or work episode updates the inspector or work detail according to `NitroMapSelection`
- keyboard focus activation and search-result activation use the same selection behavior as pointer selection
- project switching preserves the current NitroMap surface when possible and does not leak previous project data
- project switching from Work detail to a project missing that episode falls back to the new project's Work list and clears stale episode details
- `/projects/$environmentId/$projectId/work` shows active, blocked, and recent work episodes
- `/projects/$environmentId/$projectId/work/$episodeId` opens work detail and exposes an explicit transcript action
- blocked approval, pending input, failed turn, diff review, and terminal attention states surface in the work panel without requiring transcript navigation
- approval and user-input primary actions work from the work panel or drawer and keep the user on NitroMap routes unless transcript is explicitly chosen
- diff and terminal actions open their NitroMap detail/drawer surfaces without routing through ChatView
- `Start work` is disabled and non-interactive through Milestone 4; from Milestone 5 onward Nitro submit uses `NitroWorkEpisodeAdapter` and successful episode starts link to work detail
- composer controls show a project-map icon adjacent to the Nitro button
- Nitro submit is disabled before the project has a Cartographer-generated ownership map, with hover text directing the user to run the Cartographer
- mobile layout exposes map/list, work, and Map Maintenance without losing blocking work visibility
- offline or reconnecting state keeps the last known map visible with a status indicator
- missing project and unavailable map states show project-scoped fallbacks and do not open unrelated threads
- permission-denied or project-inaccessible states show project-scoped fallbacks and do not open unrelated threads
- no selected project, no generated mock map, map loading, and active-work-unavailable states show project/map-oriented fallbacks rather than thread-centric or blank states

E2E fixtures should prefer deterministic mock data from `NitroMapDataSource`. Tests must not depend on a live provider run for the mocked shell milestones. Milestone 5 adapter-backed e2e may use a deterministic fake adapter/thread bridge. Real provider-backed e2e coverage should start after Milestone 5, and should cover the adapter boundary rather than re-testing the whole transcript timeline.

Minimum e2e gates by milestone:

- Milestone 3: direct project map route smoke test proving the route is reachable from navigation, uses the NitroMap route branch, and does not render the thread sidebar as the project shell.
- Milestone 4: direct map route smoke test, route/layout test, primary nav route test for Map/Work/Map Maintenance from each Milestone 4 NitroMap source surface, mocked project-switch preservation test, selection-to-inspector tests for resource, agent, agent-instance, responsibility, edge, intervention, and map-reconciliation-action selections, keyboard/search selection test, round-list and round-graph mock tests, map fallback-state tests, disabled Start work test, no-thread-language test, old-shell-exclusion test, mobile navigation smoke test.
- Milestone 5: work episode detail test, work-episode selection-to-detail test, round deep-link test, result-message back-link test, primary nav route test from Work detail, regular-submit-does-not-create-episode test, running-episode-blocks-regular-submit test, Nitro-disabled-before-Cartographer test, Nitro project-map-icon adjacency test, blocking work visibility test, approval/user-input action test, diff/terminal action test, transcript action test, deterministic fake-adapter Nitro-submit/resume smoke test that lands on `/projects/$environmentId/$projectId/work/$episodeId`, missing/ambiguous episode mapping fails-closed test.
- Milestone 6: authenticated startup routing test, project switch test, work-detail project-switch fallback test, legacy transcript deep-link test, reconnect/stale-map test.
- Milestone 8 and later: backend snapshot/replay smoke test once real NitroMap subscriptions exist.

Keep the e2e suite small. Add new browser coverage when a regression would be expensive to notice manually or when a milestone changes route ownership, startup behavior, blocking workflows, or compatibility transcript behavior.

### Navigation E2E Matrix

Navigation tests should cover movement to and from each NitroMap surface, not only direct entry to each route.

| Start                               | User action                              | Expected destination                                                                                                             | Active state             | Context rule                                                                     |
| ----------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| Authenticated landing/project entry | open/select project                      | `/projects/$environmentId/$projectId/map`                                                                                        | Map active               | NitroMap shell renders and no thread-sidebar controls appear                     |
| Map                                 | click Work                               | `/projects/$environmentId/$projectId/work`                                                                                       | Work active              | project preserved, selection may be cleared unless represented as work context   |
| Map                                 | click Map Maintenance                    | `/projects/$environmentId/$projectId/map-maintenance`                                                                            | Map Maintenance active   | project preserved, no thread sidebar                                             |
| Work                                | click Map                                | `/projects/$environmentId/$projectId/map`                                                                                        | Map active               | project preserved, no automatic transcript open                                  |
| Work                                | open episode                             | `/projects/$environmentId/$projectId/work/$episodeId`                                                                            | Work active              | episode must belong to current project                                           |
| Work                                | select round                             | `/projects/$environmentId/$projectId/work` or `/projects/$environmentId/$projectId/work/$episodeId`                              | Work active              | round graph and inspector update without opening transcript                      |
| Work detail                         | back to Work                             | `/projects/$environmentId/$projectId/work`                                                                                       | Work active              | episode detail cleared, work list remains project-scoped                         |
| Work detail                         | open transcript                          | `/$environmentId/$threadId`                                                                                                      | outside NitroMap nav     | transcript route shows back link to owning project work detail or map when known |
| Transcript compatibility            | use back link                            | `/projects/$environmentId/$projectId/work/$episodeId` when episode is known, otherwise `/projects/$environmentId/$projectId/map` | Work or Map active       | no loss of project identity                                                      |
| Map Maintenance                     | select related map reconciliation target | `/projects/$environmentId/$projectId/map`                                                                                        | Map active               | inspector selects related resource, agent, responsibility, or edge               |
| Any NitroMap route                  | switch project                           | same surface for new project when valid                                                                                          | same active route        | data changes to new project and old project data is not visible                  |
| Work detail                         | switch to project missing episode        | `/projects/$environmentId/$newProjectId/work`                                                                                    | Work active              | stale episode details are cleared                                                |
| Any NitroMap route                  | browser back/forward                     | previous/next NitroMap or transcript route                                                                                       | active state matches URL | no stale inspector/work state from a different project                           |
| Any NitroMap route                  | mobile tab change                        | corresponding mobile route/tab                                                                                                   | active tab matches route | blocking work remains visible or one tap away                                    |

Parameterized primary-nav coverage should run the same navigation assertion from each available NitroMap source surface. In Milestone 4, the source surfaces are Map, Work, and Map Maintenance. Work detail becomes a source surface in Milestone 5 when `/projects/$environmentId/$projectId/work/$episodeId` exists. From each source, clicking Map, Work, and Map Maintenance should produce the expected URL, active nav state, NitroMap shell, project-scoped mock data, and cleared route-local detail state when leaving Work detail.

These tests do not need to exhaustively cover every pairwise route transition beyond the parameterized primary-nav case. They should also cover the special transitions that can regress product identity: app/project entry, work detail, transcript compatibility, project switch, browser back/forward, and mobile tabs.

### User Story Acceptance Matrix

Use these stories to decide whether the mocked preparation UI is coherent before real NitroMap intelligence exists.

| Story                                       | Given                                                                     | When                                                          | Then                                                                                                                                             | Minimum milestone |
| ------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Inspect ownership map                       | a project has deterministic mock map data                                 | the user opens the project map                                | the NitroMap shell shows map/list, work summary, map maintenance summary, and inspector without thread-sidebar navigation                        | 4                 |
| Inspect resource ownership                  | a resource has responsibilities and owning agents                         | the user selects the resource by pointer, keyboard, or search | the inspector shows resource identity, matched responsibilities, owning agents, and query context                                                | 4                 |
| Inspect abstract agent instance             | a management agent appears next to multiple resources                     | the user selects one visual instance                          | the inspector explains the canonical agent, responsibility, and resource context for that instance                                               | 4                 |
| Inspect responsibility query                | a responsibility has a concrete query                                     | the user selects the responsibility                           | the inspector shows structured query definition and current resource matches                                                                     | 4                 |
| Inspect ownership edge                      | an edge links an agent, responsibility, and resource                      | the user selects the edge                                     | the inspector explains why that ownership relation exists                                                                                        | 4                 |
| Review map reconciliation action            | mocked map reconciliation actions exist                                   | the user opens Map Maintenance or selects an action           | the action is read-only, disabled recompute is clearly non-live, and before/after ownership context appears when available                       | 4                 |
| Review work rounds                          | a project has deterministic mock episode data                             | the user opens Work                                           | episodes show their rounds, and the selected round renders concrete agent invocations as a left-to-right execution graph                         | 4                 |
| Inspect round trace                         | a round has ownership traces                                              | the user selects a trace or invocation                        | the detail panel shows the concrete agent state, trigger, status, and whether the trace was injected into the main thread                        | 4                 |
| Review work-linked intervention             | a work-episode-linked intervention exists                                 | the user selects it from Work                                 | the project-scoped work detail opens when the episode mapping is validated; otherwise the Work list fallback appears                             | 5                 |
| Start work placeholder                      | the shell is at Milestone 4                                               | the user sees Start work                                      | the affordance is visibly disabled/non-interactive, creates no episode, calls no adapter mutation, and cannot link a backing thread              | 4                 |
| Start episode with Nitro                    | the shell is at Milestone 5 or later and no episode is running            | the user clicks Nitro submit from a conversation composer     | the action goes through `NitroWorkEpisodeAdapter`, creates a new episode for that conversation, starts the first round, and links to Work detail | 5                 |
| Show Nitro map context                      | the conversation composer is visible                                      | the user looks at the submit controls                         | a project-map icon appears adjacent to the Nitro button                                                                                          | 5                 |
| Block Nitro before Cartographer             | the Cartographer has not yet produced a project ownership map             | the user hovers the Nitro button                              | Nitro is disabled and the hover text tells the user to run the Cartographer first                                                                | 5                 |
| Regular submit stays ordinary               | no episode is running for the conversation                                | the user presses Enter or clicks the regular send button      | the existing main-agent chat flow runs and no work episode is created                                                                            | 5                 |
| Running episode blocks ordinary submit      | a Nitro episode is running for the conversation                           | the user tries to send ordinary chat input                    | regular submit is disabled or blocked, and the user can inspect Work details or abort                                                            | 5                 |
| Round result appears in chat                | a Nitro round finishes                                                    | the round output is ready                                     | a real `system` message appears in the main conversation with links to the episode and round details                                             | 5                 |
| Resume work                                 | a project has an active or recent episode                                 | the user opens Work and selects the episode                   | the project-scoped work detail opens with status, blockers, changed-resource summary when available, and transcript action                       | 5                 |
| Handle approval blocker                     | a work episode has an approval blocker                                    | the user opens the primary action                             | approval can be handled in a NitroMap work panel/drawer and the user remains on NitroMap unless transcript is explicitly opened                  | 5                 |
| Handle input blocker                        | a work episode needs user input                                           | the user opens the primary action                             | input can be answered in a NitroMap work panel/drawer and the episode updates through the adapter                                                | 5                 |
| Inspect diff/terminal blocker               | a work episode has diff or terminal attention                             | the user opens the primary action                             | a NitroMap-hosted drawer/panel opens using existing diff or terminal APIs without routing through `ChatView`                                     | 5                 |
| Open transcript escape hatch                | a work episode has a backing thread                                       | the user chooses open transcript                              | `/$environmentId/$threadId` opens and provides a back link to project work detail or map when known                                              | 5                 |
| Switch project in mocked shell              | the user is on any NitroMap route with mocked project data                | the user switches project                                     | the app stays on the equivalent surface when valid, clears invalid selection/episode context, and never shows old project data                   | 4                 |
| Invalid episode mapping fails closed        | an episode id is missing, belongs to another project, or maps ambiguously | the user opens or resumes that episode                        | the app shows a project-scoped fallback or Work list, clears stale detail state, and never opens or links an unrelated backing thread            | 5                 |
| Switch project with backend/bootstrap state | the user is on any NitroMap route after startup behavior exists           | the user switches project                                     | bootstrap, permissions, and route fallbacks preserve the same project-scoped safety rules                                                        | 6                 |
| Startup prefers map                         | bootstrap knows a project                                                 | the user opens the app                                        | startup lands on the project map, treats a known thread as a conversation, and shows active work only when an episode mapping exists             | 6                 |
| Legacy transcript deep link                 | the user opens an existing thread URL                                     | the route loads                                               | the transcript still works, with project back link when the owner is known                                                                       | 6                 |
| Reconnect or offline                        | a last known map exists                                                   | websocket reconnects or goes offline                          | the stale map remains visible with connection status and no unrelated thread fallback                                                            | 6                 |
| Missing project or unavailable mock map     | the project route is missing or mock map data is unavailable              | the user opens the project route                              | a project-scoped fallback appears and the app does not open an unrelated thread                                                                  | 4                 |
| Permission or inaccessible project          | the project is inaccessible after permission/bootstrap data exists        | the user opens the project route                              | a project-scoped fallback appears and the app does not open an unrelated thread                                                                  | 6                 |
| Mobile navigation                           | the user is on a narrow viewport                                          | the user moves between tabs/routes                            | map/list, work, Map Maintenance, and mock work summary are reachable                                                                             | 4                 |
| Mobile blocking work                        | the user is on a narrow viewport and a real blocking item exists          | the user opens the work surface or blocking summary           | blocker visibility and primary actions remain available without transcript navigation                                                            | 5                 |

If a story is implemented with mocked data, the mock must still use the same UI boundaries and route behavior expected from the later real implementation. A story should not be marked complete if it only works by special-casing a component test fixture in a way the app route cannot use.

## Milestone Map

### Milestone 1: Document And Name The Target

Outcome:

- NitroMap vision exists
- preparation plan exists
- current thread-first architecture is understood
- worktree ownership semantics are corrected

Status:

- mostly complete

### Milestone 2: Introduce NitroMap Mock Domain

Outcome:

- add local NitroMap types
- add deterministic mock data
- add selectors for map view, active work, map reconciliation actions, and inspections
- no route or product behavior change yet

Quality bar:

- no large components
- selector tests included
- mock data does not live inside React components
- `NitroMapDataSource` interface exists and is the only way UI code reads mock NitroMap data
- mock data is scoped by `environmentId + projectId`

### Milestone 3: Add Map-First Project Route

Outcome:

- add a project map route using mocked NitroMap data
- keep existing chat routes working
- provide navigation from existing project/sidebar surfaces to the map route
- no real ownership backend yet

Quality bar:

- route helpers are typed
- empty/loading states are map/project-oriented
- no `No active thread` language in NitroMap surfaces
- route renders inside the NitroMap route-branch shell
- existing `/$environmentId/$threadId` transcript route remains reachable

### Milestone 4: Build NitroMap Shell With Mocked UI Surfaces

Outcome:

- map canvas dominates the project screen
- Work exists as episode and round overview, not a generic activity feed
- map maintenance panel exists
- agent/resource inspector exists
- `/projects/$environmentId/$projectId/work` exists as a mocked work list surface
- `/projects/$environmentId/$projectId/map-maintenance` exists as a mocked map reconciliation action surface
- conversation transcript is not the default center surface

Quality bar:

- canvas component is isolated
- panels are separate components
- selection state is minimal and testable
- no dependency on real Cartographer behavior
- inspector behavior is defined for resources, agents, responsibilities, edges, interventions, and map reconciliation actions
- mocked Work shows episodes, rounds, round traces, and concrete agent invocations without opening a transcript
- map maintenance controls are read-only mock history or clearly disabled placeholders

### Milestone 5: Bridge Existing Threads To Work Episodes

Outcome:

- Nitro submit can create a work episode attached to the current project conversation
- one conversation can create many episodes over time
- each episode has a distinct `episodeId` even when it shares the same conversation thread as earlier episodes
- existing `thread.turn.start` still drives provider execution
- regular composer submit remains an ordinary main-agent message when no episode is running and does not create a work episode
- regular composer submit is blocked while a Nitro episode is running for that conversation
- the Nitro composer submit button is the explicit work-episode entry point and starts the first round
- the composer shows a project-map icon adjacent to the Nitro button
- the Nitro composer submit button is disabled until the Cartographer has produced a project ownership map
- round completion inserts a real compact `system` message into the main conversation with deep links to episode and round details
- compact work panel can show current episode and round status from existing thread state
- full ChatView remains available as transcript/detail fallback

Quality bar:

- provider execution remains unchanged
- thread id is not the user-facing product identity in new UI
- each project can have many conversations, each conversation can have many episodes, and all episodes share the project ownership map
- each episode has separate round, trace, blocker, result-message, and abort state
- no duplicated send-turn logic
- Enter and the regular send button do not call the work-episode adapter and remain disabled/blocked while the conversation has a running Nitro episode
- clicking the Nitro button goes through the work-episode adapter and creates a new episode/first round for the current conversation
- disabled Nitro state explains that the user must run the Cartographer before starting a Nitro episode
- Work owns episode, round, trace graph, invocation state, blocker, and abort details; the main conversation stays lean
- no global current-thread fallback is allowed for work episode mapping
- `NitroWorkEpisodeSummary` includes `conversationThreadId`, `startedFromMessageId`, `backingThreadId`, and `transcriptRoute`
- round summaries expose the `system` result message id when one exists
- work-episode selection-to-detail behavior is defined and tested
- active turns can be aborted from the work episode UI without opening the transcript
- blocking approval, pending input, failure, diff, and terminal states are reachable from the work episode UI

### Milestone 6: Replace Default Authenticated Landing Behavior

Outcome:

- opening the app prefers project/map context over auto-opening a thread
- bootstrap behavior can route to a project map when possible
- thread routes remain valid deep links

Quality bar:

- no broken startup flow
- remote environments still bootstrap
- settings and command palette still work
- when both project and thread bootstrap ids exist, landing prefers project map, treats the thread as a known conversation, and shows active work only when an episode mapping exists
- deep links to `/$environmentId/$threadId` still open the transcript view

### Milestone 7: Prepare Backend Contracts

Outcome:

- add schema-only NitroMap contract candidates
- add server-side placeholder snapshot shape if needed
- do not implement real Cartographer logic yet

Quality bar:

- contracts stay schema-only
- no runtime logic in `packages/contracts`
- no fake long-term persistence hidden behind production names
- RPC or subscription boundary is documented before implementation
- sequence/version and reconnect behavior are specified

### Milestone 8: Backend Projection Scaffold

Outcome:

- add migrations for NitroMap projection tables or clearly named experimental tables
- add repository/service boundaries
- add snapshot query methods for map state
- keep data mocked or seeded until real ownership computation exists

Quality bar:

- event/projection style preserved
- no ad hoc SQL from route handlers
- migration tests added if schema is non-trivial
- source-of-truth records are separated from derived projections
- experimental or mock persistence is explicitly named and has a removal path

### Milestone 9: Replace Mocks With Real Sources Incrementally

Outcome:

- resources can be derived from workspace/git/project data
- responsibilities can be persisted
- map reconciliation actions can be recorded
- interventions can be projected from activity/provider/git/diff signals

Quality bar:

- each mock replacement is behind the same interface
- no UI rewrite required when real data arrives
- resource identity rules remain stable as real data replaces mocks
- map reconciliation actions, interventions, and work episodes keep distinct domain meanings

## Non-Goals For Preparation

- no real autonomous Cartographer
- no real responsibility-query evaluator
- no real ownership-agent runtime
- no automatic intervention engine
- no remote-resource indexing beyond mocked examples
- no deletion of the existing thread execution path
- no final graph-layout dependency decision unless the simple map prototype proves insufficient

## Key Architectural Principle

Preparation should move the product model before moving the intelligence.

If the UI and code structure still treat threads as the center of the application, real ownership agents will be forced into chat-shaped abstractions. NitroMap needs the opposite: a project-level ownership shell first, mocked intelligently, with current threads kept as execution plumbing until real work episodes and ownership services are ready.
