# NitroMap Ownership Map Vision

## Purpose

T3 Code currently presents coding-agent work as a chat application: projects contain threads, threads contain turns and messages, and the sidebar is the primary navigation model. This vision replaces that product shape with an ownership-oriented agent workspace.

Projects remain a first-class concept, but the main project surface becomes an ownership map rather than a list of chats. The map shows persistent agents, the scopes they care about, the relationships between those scopes, and the live interventions those agents make while work is happening.

The user can still start a conventional conversation, but a conversation is no longer the organizing center of the product. A conversation is an active work episode inside a project ownership map.

## Core Idea

Each project has an ownership map. The map describes which agents are responsible for which parts of the project, how those responsibilities relate to each other, and which agents should be consulted or allowed to intervene during work.

An agent owns responsibilities. Some responsibilities are abstract, while others resolve to concrete project resources.

A concrete responsibility is not just a label like "frontend files" or "build assets." It must carry a query that resolves the actual resources the responsibility covers. The query is part of the ownership definition, so the system can decide which agents care about a file, folder, diff, command, terminal event, or remote-resource update.

Concrete responsibilities can resolve resources such as:

- a folder
- a set of files
- a generated asset
- a remote resource

A worktree is not itself an owned artifact. It is an execution context where implementation agents can operate. An agent may own responsibilities whose resource queries are evaluated inside a worktree, but it should not own the whole worktree as its scope.

Responsibility queries should be typed rather than free-form prose. Early examples:

- path query: `apps/web/**`, `packages/contracts/src/orchestration.ts`
- file-set query: tracked files matching language, extension, or manifest ownership rules
- symbol query: exported functions, components, schemas, or generated API surfaces
- generated-artifact query: files derived from another source and the generator that produces them
- git query: files changed in a branch, pull request, checkpoint, or turn diff
- remote-resource query: repository issues, pull requests, CI jobs, deployments, docs pages, or external service objects
- event query: terminal commands, provider activity, build failures, approvals, or runtime errors relevant to the responsibility

An agent can also own an abstract project concern, such as:

- build engineering
- release process
- testing strategy
- frontend architecture
- provider integration
- security posture
- observability

Ownership is therefore not limited to paths in a repository. It is a typed claim about responsibility.

## Responsibility Queries

Every non-abstract responsibility needs a resource query. The query is how the system answers the operational question: "does this event, resource, or proposed change touch this agent's scope?"

The query should be explicit enough to support automation, but expressive enough to cover more than path globs. A responsibility should have at least:

- a stable responsibility id
- an owning agent id
- a responsibility type
- a query type
- query parameters
- an evaluation context
- a human-readable rationale
- optional confidence and provenance

Example responsibility shapes:

```ts
type ConcreteResponsibility =
  | {
      type: "path";
      query: {
        root: "project" | "repository" | "workspace";
        include: string[];
        exclude?: string[];
      };
    }
  | {
      type: "symbol";
      query: {
        language: "typescript";
        exportedNames?: string[];
        sourceFiles: string[];
      };
    }
  | {
      type: "generatedArtifact";
      query: {
        outputs: string[];
        generatorCommand?: string;
        sourceInputs?: string[];
      };
    }
  | {
      type: "gitChange";
      query: {
        selector: "current-branch" | "pull-request" | "turn-diff" | "checkpoint";
        include?: string[];
        exclude?: string[];
      };
    }
  | {
      type: "remoteResource";
      query: {
        provider: "github" | "ci" | "deployment" | "docs" | string;
        resourceKind: string;
        selector: Record<string, unknown>;
      };
    }
  | {
      type: "runtimeEvent";
      query: {
        eventKinds: string[];
        match?: Record<string, unknown>;
      };
    };
```

This is only a candidate shape, not a final contract. The important requirement is that concrete ownership must be computable. A supervisor can still explain a responsibility in natural language, but the system needs a query it can evaluate.

Queries should also be composable. A build engineer may have an abstract build responsibility plus several concrete responsibilities:

- path query for package manifests and build configs
- generated-artifact query for generated lockfiles or codegen outputs
- remote-resource query for CI workflows and failed build jobs
- runtime-event query for terminal commands that run build tooling

The map should retain the distinction between the broad management concern and each concrete query-backed resource scope.

## Supervisor

Every project has a special management agent called the supervisor. The supervisor is responsible for creating, deleting, consolidating, and modifying ownership agents.

The supervisor is implemented as a skill. Its job is not to perform normal implementation work directly. Its job is to maintain the project organization:

- discover existing project structure
- create initial ownership agents
- assign concrete query-backed responsibilities over files, folders, repositories, generated artifacts, events, or remote resources
- assign abstract scopes such as build, architecture, testing, release, or product concerns
- revise agent responsibilities as the project evolves
- split agents when one responsibility becomes too broad
- merge agents when responsibilities are redundant
- delete agents whose role no longer exists
- update ownership hierarchy when concrete and abstract scopes overlap

Ownership agents do not experience these changes as external edits to their personality. From an individual ownership agent's point of view, its current role is simply what it is. The supervisor can modify an agent's core behavior and responsibility behind the scenes, and the agent should act according to the latest assigned scope.

## Ownership Agents

Ownership agents persist as part of the project map. They are not just participants in a single chat thread.

An ownership agent represents responsibility for a domain. During a user-facing work episode, it can help in two ways:

1. It can be asked directly by the user-facing agent for context, warnings, decisions, or review.
2. It can observe relevant project activity and intervene when it believes the current work is violating or neglecting its responsibility.

This allows a user request to be interpreted from multiple angles. For example, a request that looks like a frontend change may also trigger a build engineer because package scripts changed, a testing owner because coverage should be adjusted, and an architecture owner because the change crosses module boundaries.

## Implementation Agents And Management Agents

The model has a hard split between implementation agents and management agents.

Implementation agents are bound to a workspace. A workspace can be a git repository, a worktree, or another concrete execution environment. Implementation agents own query-backed responsibilities evaluated in that workspace and can perform or supervise changes there.

Management agents are abstract. They do not own files directly in the same way. Instead, they own a category of concern across any relevant workspace. A management agent may care about many files, many repositories, remote services, policies, or workflows, but its ownership is conceptual rather than workspace-bound.

The distinction is semantic, not merely visual:

- implementation agents are grounded in concrete mutable workspaces
- management agents are grounded in cross-cutting responsibility
- both can participate in a user-facing work episode
- both can appear in the ownership map
- only implementation agents own responsibilities over workspace-local implementation scope

## Ownership Hierarchy

Ownership can overlap, so the map needs hierarchy.

For example, a build engineer may be responsible for all build-related concerns across the project. Another implementation agent may own `package.json`, a Vite config file, or a CI workflow file. Both agents care about the same artifact, but at different levels:

- the implementation agent owns the concrete file or folder
- the build engineer owns the build concern expressed through that file

When scopes overlap, the map should make the relationship explicit. An ownership edge should explain whether one agent delegates to another, supervises another, reviews another, or shares concern with another.

The product should avoid treating ownership as a flat list of path globs. The important object is a responsibility graph.

## User-Facing Work Episodes

The user still starts work by speaking to an agent. That user-facing agent behaves mostly like the existing harness expects: it can receive a request, use tools, ask questions, generate plans, and produce changes.

The difference is that the user-facing agent operates in the context of the ownership map. It is expected to know how to use the map:

- identify agents whose scope is relevant to the request
- ask those agents for context before acting
- route design questions to management agents
- route concrete implementation questions to implementation agents
- consider interventions from ownership agents during work
- explain conflicts or unresolved ownership disagreements to the user when needed

In many cases, the ownership agent should intervene before being asked. If it observes relevant files, diffs, terminal output, provider events, or remote-resource changes, it may decide that the active work episode needs guidance.

This should feel less like a one-on-one chat and more like working inside a living project organization where the right specialists notice when their domain is touched.

## Conversation And Reset Semantics

A new conversation resets the active ownership agents' conversational state, but it does not reset the ownership map.

The map is project memory. It persists until the user explicitly asks to recompute it from scratch or until the system applies a partial recomputation heuristic.

Expected reset behavior:

- starting a new conversation clears ephemeral work-episode context
- ownership agents begin the new episode with fresh conversation state
- agent definitions, scopes, hierarchy, and supervisor-maintained organization persist
- the user can explicitly request a full ownership-map recompute
- the system may perform partial recomputation when project structure changes enough to justify it

The distinction matters because the ownership map represents project organization, not chat history.

## Map Evolution

The ownership map should evolve over time.

Initial ownership can be derived from repository structure, package boundaries, file types, naming conventions, existing docs, tests, CI, and recent user activity. That initial map will be imperfect. The supervisor should refine it as evidence accumulates.

Map evolution can be triggered by:

- major file or folder changes
- new packages, apps, or services
- repeated ownership conflicts
- repeated interventions from the same agent
- stale scopes with no matching artifacts
- new remote resources
- user corrections
- supervisor review
- explicit recompute commands

The system should prefer stable, predictable ownership over excessive churn. A map that changes constantly will be hard for users and agents to trust.

## Product Shape

The primary UI should stop being a chat sidebar plus message timeline.

The new first-order surfaces are:

- project list or project switcher
- ownership map
- active work episode
- agent details
- scope details
- intervention stream
- map recomputation and supervisor actions

The ownership map should be the main navigation and orientation surface inside a project. It should show agents, responsibilities, hierarchy, and active status. The user should be able to inspect an agent to understand what it owns, why it exists, when it last intervened, and what evidence supports its scope.

The active work episode can still include a conversational transcript, but it should not dominate the product. It is one panel or mode inside the map-driven workspace.

## UI Concept Direction

NitroMap should feel like an operational project map, not a chat product with extra panels.

The default project screen should make the ownership map the dominant surface. A compact left navigation can switch between projects, map, conversations, supervisor, agents, and activity, but the center of gravity is the map canvas. The user should arrive in a project and immediately see the important owned resources, which agents own them, where responsibility overlaps, and what work is active.

The map canvas should render resources as legible visual nodes rather than as a plain filesystem tree. Useful node categories include:

- folders and package areas
- file groups selected by responsibility queries
- generated artifacts
- tests
- CI pipelines
- pull requests
- docs
- deployments
- databases and remote services

Agent ownership should be shown adjacent to the resources it applies to. If an abstract management agent owns many resources through a responsibility query, the UI may draw that agent multiple times near the relevant resources. These repeated visual instances should resolve back to one canonical agent profile, so the map stays local and readable without duplicating the underlying agent.

The UI should support at least three inspection paths:

- resource inspection: what this node represents, which queries selected it, who owns it, and what changed recently
- agent inspection: role, type, responsibilities, matched resources, recent interventions, and supervisor rationale
- ownership-change inspection: what the supervisor changed, from whom, to whom, why, and when

The active user conversation should be compact. It should show the current request, active work state, involved agents, interventions, changed resources, approvals, and final outcome. It should not render a long chat transcript by default. NitroMap assumes users inspect details through the editor, diffs, resource panels, terminals, and map nodes when they need precision.

Conversation history still exists, but it is not primary navigation. A project can have many conversations, and all conversations share the same ownership map and agent assignment. A conversation is a work episode over the project organization, not an isolated chat room with its own agent universe.

The supervisor needs a separate, explicit surface. This can be a dedicated supervisor panel, tab, or chat-like control area attached to the map. Its purpose is map maintenance:

- recompute ownership
- explain why an agent owns a resource
- change responsibility queries
- split or merge agents
- accept or reject proposed ownership changes
- inspect recomputation history

Supervisor actions should be visible as map diffs rather than buried in prose. The user should be able to see agents added, agents removed, responsibilities changed, query matches changed, and hierarchy changes.

Interventions should appear in both the active work panel and the map. A warning from a build engineer should visually connect to the affected build resources. A test-owner intervention should connect to the relevant test nodes. This makes agent feedback spatially grounded and prevents the activity stream from becoming another chat log.

The map should prioritize usability across several dimensions:

- orientation: the user can quickly understand project structure and responsibility boundaries
- locality: resource nodes show nearby owners without requiring global lookup
- hierarchy: abstract and concrete ownership relationships are visible without flattening everything into path globs
- actionability: active work, interventions, and changed resources are one click away from details
- compactness: chat history is summarized and does not consume the main interface
- explainability: every ownership assignment can be traced to a query, rationale, supervisor action, or recomputation result
- stability: the map should not rearrange unpredictably while work is in progress
- performance: large histories and verbose transcripts should stay out of the hot rendering path
- debuggability: ownership conflicts, stale assignments, and low-confidence scopes should be inspectable
- recoverability: recompute actions and supervisor edits should have visible history and reversibility

## Relationship To Current Architecture

The current architecture already has useful primitives:

- projects
- threads
- provider sessions
- provider runtime events
- server-side orchestration events
- durable projections
- websocket push updates
- checkpoint and diff summaries
- runtime receipts for async completion

The ownership-map system can build on these concepts, but it likely needs new domain objects. Threads are not enough. A thread currently represents the primary user-facing work container. In the ownership model, the durable project-level graph is primary, and a conversation is only one kind of work episode attached to that graph.

Potential future objects:

- ownership map
- ownership agent
- supervisor action
- scope claim
- ownership edge
- intervention
- work episode
- agent memory snapshot
- map recomputation job

The current event-sourced orchestration style is a strong fit for this model because ownership changes, interventions, and work-episode activity all need to be observable, replayable, and projectable into UI state.

## Open Questions

- What is the exact schema for an ownership scope?
- How should file ownership, conceptual ownership, and remote-resource ownership share one model?
- How much autonomy should an ownership agent have to interrupt active work?
- Which interventions are advisory, blocking, or require user confirmation?
- How are conflicts between ownership agents resolved?
- How much of the supervisor's work is automatic versus explicitly user-triggered?
- How should partial recomputation decide which agents to preserve, update, split, or delete?
- What are the persistence boundaries for agent memory?
- How should implementation agents map to worktrees when multiple worktrees exist for one project?
- Should a user-facing work episode always have a lead agent, or can the map route the user directly to a group?
- What parts of the existing thread model survive as compatibility plumbing?

## Design Principle

The goal is not to decorate a chat app with agent labels. The goal is to make project responsibility the central interface.

The user should feel that the project has an adaptive organization around it. Agents are not merely personas in a sidebar. They are persistent owners of project responsibilities, coordinated by a supervisor, surfaced through a map, and involved in work because the scope of the work touches what they own.
