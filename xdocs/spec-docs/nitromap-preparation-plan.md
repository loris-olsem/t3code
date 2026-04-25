# NitroMap Preparation Plan

## Purpose

This document is about preparing T3 Code for the NitroMap direction without implementing the real ownership-map intelligence yet.

The goal of this phase is structural: reshape the app so the product can become map-first, project-first, and work-episode-based while current provider/thread execution keeps working underneath. New NitroMap surfaces may use mocked data and placeholder services at first. Those mocks are not throwaway UI hacks; they should define the seams where real ownership agents, responsibility queries, supervisor actions, and interventions will later connect.

This is a preparation plan, not the final NitroMap implementation plan.

## Current Constraints

The current product is deeply thread-centric.

- Authenticated routes are wrapped in `AppSidebarLayout`, which renders the existing thread sidebar.
- The primary route is `/_chat/$environmentId/$threadId`.
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

Do not try to build the real supervisor, ownership agents, or responsibility-query evaluator in the first UI cut.

Instead, introduce the NitroMap product structure with mocked domain data:

- map canvas with mocked resources
- mocked ownership agents
- mocked responsibility query metadata
- mocked interventions
- mocked supervisor change history
- mocked active work episode summary

The mock layer should be explicit and replaceable. It should live behind a small interface that resembles the future real read model. This prevents UI code from hardcoding fake objects in components and makes the eventual backend integration much cleaner.

The first functional target is:

> A user opens a project and sees a NitroMap shell instead of a chat-first thread layout. The shell shows a map-first project surface with mocked ownership data and a compact work panel. Existing conversations can still be launched and backed by current threads, but they are visually demoted.

## Product Structure To Prepare

The prepared app should move toward these top-level concepts:

- project
- ownership map
- work episode
- supervisor
- agents
- activity

Existing concepts should map as follows:

- current project -> NitroMap project
- current thread -> backing implementation for a work episode
- current messages -> detailed transcript for a work episode, not primary UI
- current activities -> raw material for interventions/activity
- current proposed plans -> possible work-episode artifacts
- current checkpoints/diffs -> changed resources and result inspection
- current branch/worktree controls -> execution-context controls, not ownership model

This lets current functionality continue while the product language changes.

## UI Shell Changes

The current `AppSidebarLayout` should not remain the main product frame long term. It is thread-sidebar-first.

Introduce a new app shell that can support:

- project switcher
- map route
- conversations/work episodes route
- supervisor route or panel
- agents route or panel
- activity route
- settings route

Early implementation can keep the existing sidebar component primitives, but not the existing thread-sidebar information architecture. The user should not experience the product as "pick a thread to continue." They should experience it as "open a project map, then inspect or start work."

The empty state should become project/map oriented:

- no selected project
- project has no generated mock map yet
- map data loading
- map data unavailable
- active work unavailable

Avoid threading "No active thread" language through new surfaces.

## Route Preparation

Create route concepts that can support NitroMap without breaking existing thread routes.

Candidate route shape:

- `/projects/$environmentId/$projectId/map`
- `/projects/$environmentId/$projectId/work`
- `/projects/$environmentId/$projectId/supervisor`
- `/projects/$environmentId/$projectId/agents`
- `/work/$environmentId/$episodeId`

During preparation, `episodeId` may still be the existing `threadId` or a thin wrapper around it. The route names should not expose that implementation detail once NitroMap becomes primary.

Existing `/_chat/...` routes can remain during the transition. They should become compatibility routes or deep transcript/detail routes.

## Mock Domain Layer

Create a small mock NitroMap domain layer before building the UI.

The mock layer should define types close to the intended future read model:

```ts
interface NitroMapProjectView {
  projectId: string;
  environmentId: string;
  map: NitroMapSnapshot;
  activeWork: NitroWorkEpisodeSummary | null;
  supervisor: NitroSupervisorSummary;
}

interface NitroMapSnapshot {
  resources: NitroResourceNode[];
  agents: NitroAgent[];
  responsibilities: NitroResponsibility[];
  edges: NitroOwnershipEdge[];
  interventions: NitroIntervention[];
  supervisorChanges: NitroSupervisorChange[];
}
```

This does not need to be the final contract. It should be good enough to shape component boundaries.

Mock data should be deterministic, small, and testable. It should not be generated randomly in render paths.

The mock layer should support at least:

- one project with resource nodes
- several implementation agents
- several management agents
- repeated visual instances of abstract agents
- mocked responsibility queries
- mocked active work
- mocked interventions
- mocked supervisor ownership changes

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
- `apps/web/src/nitromap/components/NitroSupervisorPanel.tsx`
- `apps/web/src/nitromap/components/NitroInspectorPanel.tsx`

Keep component responsibilities narrow:

- shell handles layout
- canvas handles spatial map rendering
- resource nodes render resources
- agent badges render agent identity and local ownership role
- work panel summarizes active work
- supervisor panel shows recompute and ownership changes
- inspector panel explains selected resources, agents, and responsibilities

Avoid creating another `ChatView`-sized component.

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

## Conversation Demotion

Do not delete thread functionality during preparation.

Instead:

- keep current thread execution plumbing
- expose current or active thread as a compact work episode
- show only high-value summaries in the NitroMap shell
- keep full message timeline behind a detail route, drawer, or "open transcript" action
- preserve existing approval, pending input, diff, and terminal functionality while gradually moving controls into work-episode panels

The preparation phase should make long chat history non-primary without breaking provider workflows.

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
- `NitroIntervention`
- `NitroSupervisorAction`
- `NitroWorkEpisode`

Do not encode ownership agents as special threads. That would preserve the wrong architecture.

Provider sessions may remain keyed by `threadId` until a real work-episode aggregate exists. The important preparation step is to stop exposing `threadId` as the product-level identity in new UI.

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

## Testing Expectations

The preparation phase should still add tests where they protect seams.

Good early tests:

- mock data validates against local TypeScript types
- selectors derive map nodes and repeated agent instances predictably
- route helpers build NitroMap routes without exposing chat routes
- work panel summarization hides long transcripts by default
- supervisor change list renders deterministic rows
- selection logic opens the correct resource, agent, or responsibility detail

Avoid expensive browser tests until the component structure settles, but add browser coverage once the map shell becomes the default project view.

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
- add selectors for map view, active work, supervisor changes, and inspections
- no route or product behavior change yet

Quality bar:

- no large components
- selector tests included
- mock data does not live inside React components

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

### Milestone 4: Build NitroMap Shell With Mocked UI Surfaces

Outcome:

- map canvas dominates the project screen
- compact work panel exists
- supervisor panel exists
- agent/resource inspector exists
- conversation transcript is not the default center surface

Quality bar:

- canvas component is isolated
- panels are separate components
- selection state is minimal and testable
- no dependency on real supervisor behavior

### Milestone 5: Bridge Existing Threads To Work Episodes

Outcome:

- active/current thread can be represented as a mocked or thin work episode
- existing `thread.turn.start` still drives provider execution
- compact work panel can show current status from existing thread state
- full ChatView remains available as transcript/detail fallback

Quality bar:

- provider execution remains unchanged
- thread id is not the user-facing product identity in new UI
- no duplicated send-turn logic

### Milestone 6: Replace Default Authenticated Landing Behavior

Outcome:

- opening the app prefers project/map context over auto-opening a thread
- bootstrap behavior can route to a project map when possible
- thread routes remain valid deep links

Quality bar:

- no broken startup flow
- remote environments still bootstrap
- settings and command palette still work

### Milestone 7: Prepare Backend Contracts

Outcome:

- add schema-only NitroMap contract candidates
- add server-side placeholder snapshot shape if needed
- do not implement real supervisor logic yet

Quality bar:

- contracts stay schema-only
- no runtime logic in `packages/contracts`
- no fake long-term persistence hidden behind production names

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

### Milestone 9: Replace Mocks With Real Sources Incrementally

Outcome:

- resources can be derived from workspace/git/project data
- responsibilities can be persisted
- supervisor changes can be recorded
- interventions can be projected from activity/provider/git/diff signals

Quality bar:

- each mock replacement is behind the same interface
- no UI rewrite required when real data arrives

## Non-Goals For Preparation

- no real autonomous supervisor
- no real responsibility-query evaluator
- no real ownership-agent runtime
- no automatic intervention engine
- no remote-resource indexing beyond mocked examples
- no deletion of the existing thread execution path
- no final graph-layout dependency decision unless the simple map prototype proves insufficient

## Key Architectural Principle

Preparation should move the product model before moving the intelligence.

If the UI and code structure still treat threads as the center of the application, real ownership agents will be forced into chat-shaped abstractions. NitroMap needs the opposite: a project-level ownership shell first, mocked intelligently, with current threads kept as execution plumbing until real work episodes and ownership services are ready.
