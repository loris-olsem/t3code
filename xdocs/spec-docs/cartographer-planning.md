# Cartographer Planning

## Purpose

This document defines the next Cartographer work unit for NitroCode. It turns the ownership-map vision into an implementable plan without pretending the full agent runtime exists yet.

The goal is to replace the seeded NitroMap projection with durable project ownership data created through an explicit Cartographer flow. The Cartographer should initialize and maintain the project organization: agents, responsibilities, supervision hierarchy, and the prompt configuration used to spawn those agents during Nitro episodes.

## Product Model

Each project has one durable ownership map. The ownership map is shared by all conversations in that project.

Each project can also have special Cartographer conversations. These are normal project conversations with a marker that identifies them as map-maintenance conversations. The user is expected to reuse the same Cartographer conversation for a project, but the product must allow starting a fresh one.

A Cartographer conversation is not an ownership agent. It is not part of supervision, does not wake during normal rounds, and does not receive episode-local ownership-agent context. It exists so the user can initialize, reinitialize, inspect, and maintain the project map through a dedicated map-maintenance thread.

One Cartographer conversation may be marked as the active map-maintenance conversation for a project. Multiple historical or fresh Cartographer conversations can exist, but only the active Cartographer conversation may start an applying run. Map Maintenance should let the user switch the active Cartographer conversation deliberately. The system must not infer the active conversation from "latest thread" ordering.

Only one Cartographer run may apply for a project at a time. A project-level run lock should cover initialization, reinitialization, and patch application. Other Cartographer conversations can still contain discussion, but their proposed batches cannot commit while another run is active.

The main project conversation and Cartographer conversation have different jobs:

- Main conversation: ordinary user-facing coding conversation that can launch many Nitro episodes.
- Cartographer conversation: map-maintenance conversation that creates or changes durable ownership data.
- Ownership agents: persistent project roles produced by the Cartographer and activated during Nitro episodes.

## Initialization UX

The Map Maintenance surface should expose map readiness separately from the latest Cartographer run state. These two concepts must not be collapsed into one field because a failed reinitialization after a valid map already exists should not destroy or disable the previous validated map.

Map readiness:

- `not-run`: no durable validated ownership map exists for this project.
- `ready`: a durable validated ownership map exists and Nitro submit can be enabled.

Cartographer run status:

- `idle`: no Cartographer reconciliation is currently running.
- `running`: a Cartographer reconciliation is running or being applied.
- `failed`: the latest Cartographer reconciliation failed validation or execution.

State transitions:

| Starting state | Event | Ending state | Nitro availability |
| --- | --- | --- | --- |
| `mapReadiness: not-run`, `cartographerRunStatus: idle` | initialization starts | `not-run`, `running` | disabled |
| `not-run`, `running` | initialization fails | `not-run`, `failed` | disabled |
| `not-run`, `running` | initialization validates and persists | `ready`, `idle` | enabled |
| `ready`, `idle` | reinitialization starts | `ready`, `running` | enabled against the previous validated map until replacement commits |
| `ready`, `running` | reinitialization fails | `ready`, `failed` with previous map preserved | enabled against the previous validated map |
| `ready`, `running` | reinitialization validates and persists | `ready`, `idle` with new map version | enabled against the new map |

The current preparation contract exposes a single `cartographerStatus` field with `not-run | ready | running | failed`. Milestone 8 should migrate the contract/read model to the split shape above, or derive `cartographerStatus` as a compatibility display field while Nitro gating uses `mapReadiness`.

When the Cartographer conversation is empty and the project has no ownership map, the UI should show a helper button named `Initialize project map`. Clicking it inserts an initialization prompt into the Cartographer chatbox. It should not silently run hidden work.

When the project already has an ownership map, the helper button should be named `Reinitialize project map`. The copy must make clear that reinitialization throws away the existing ownership data and replaces it with a new validated map. This includes agents, responsibilities, supervision edges, and prompt configuration. Existing completed work-episode records remain inspectable, but future Nitro episodes use the new map.

For the first Milestone 8 implementation, the helper prompt should lead to a visible Map Maintenance action that generates a deterministic pending batch from bounded project evidence. The user can inspect and apply that typed pending batch. This is intentionally not hidden LLM parsing. Later, Cartographer structured generation can produce the same pending-batch shape from model output.

The first deterministic initializer should use a small evidence collector, not open-ended heuristics. Minimum evidence:

- project root path and project display name
- top-level directories
- recognized package or app directories from manifests and workspace config
- detected source, test, config, docs, and build files
- existing README or docs presence, by path only

The initializer may create agents only from evidence-backed groups. If evidence is insufficient to create a useful map, it should produce no pending batch and show a Map Maintenance message explaining which evidence is missing. It must not create generic software agents for non-code projects or unsupported project shapes.

The Nitro submit button in ordinary conversations remains disabled until the project has a validated ownership map. Its hover text should tell the user to run the Cartographer when the map has not been initialized.

## Cartographer Mission

The Cartographer has two responsibilities that must be balanced:

1. Understand and respect the actual project.
2. Bring sane engineering organization where the project does not already provide it.

It should not create generic coding agents for every project. A design-only project should not get software build agents. A code project should usually get some management concerns such as architecture, testing, reliability, or release process, but only when those concerns are justified by the project evidence.

The first implementation should favor stable, explainable maps over clever completeness. It is better to produce a smaller map with clear evidence than a large organization with weak rationale.

## Agent Classes

The Cartographer creates two classes of ownership agents.

### Project-Coupled Agents

Project-coupled agents are strongly tied to concrete files, directories, generated artifacts, remote resources, or responsibilities found in the local project.

Examples in a code project:

- Web UI owner for `apps/web/**`.
- Contracts owner for `packages/contracts/**`.
- Server orchestration owner for `apps/server/**`.
- Documentation owner for `README.md`, `docs/**`, or `xdocs/**`.

Project-coupled implementation agents must have query-backed responsibilities. In the first executable runtime, those queries should be file/path matchers. Broader resource query kinds remain future direction.

### Management Agents

Management agents represent cross-cutting engineering concerns that make sense for the project.

Examples in a code project:

- Architecture manager.
- Testing manager.
- Reliability manager.
- Release or packaging manager.
- UI quality manager.

Management agents supervise implementation agents or other management agents. They are woken from child-agent responses during a round, not directly from file matches in the first runtime. A management agent can supervise more than one child, and a management agent can supervise another management agent.

Management agents should not exist merely to fill a hierarchy. If a management concern has no useful child scope, the Cartographer should either omit it or mark it as tentative with a clear rationale.

## Prompt Library

NitroCode should maintain a library of prompt templates that the Cartographer can select from. The Cartographer does not invent every prompt from scratch. It chooses templates, writes project-specific scope, and assigns responsibilities.

The prompt library should include:

- a baked NitroCode base policy for all non-main ownership agents
- concise non-main-agent behavior rules inspired by the caveman style, without copying external skill text verbatim
- role templates for common management concerns such as architecture, testing, reliability, release, and UI quality
- role templates for implementation ownership over concrete project resources

External skills can inspire template design, but NitroCode should not copy their text into the product unless licensing and attribution are explicitly handled. The implementation should use NitroCode-owned template text.

## Prompt Composition

Ownership data includes how agents are spawned. The durable map must store enough prompt configuration to reproduce an agent's runtime prompt after restart.

An ownership agent prompt is assembled from:

```text
NitroCode ownership-agent base policy
  + non-main-agent behavior rules
  + selected role template
  + Cartographer-written project-specific scope
  + responsibility definitions and watched resources
  + supervision and escalation rules
```

The Cartographer decides:

- which agents exist
- whether each agent is implementation or management
- which prompt template each agent uses
- each agent's project-specific scope text
- each implementation agent's concrete responsibilities
- each management agent's supervised children
- rationale and evidence for each assignment

The application decides and enforces:

- base non-main-agent behavior rules
- allowed prompt-template ids and versions
- output format requirements
- no hidden cross-episode ownership-agent memory
- episode-local runtime context reuse across rounds
- abort, failure, validation, and retry rules

## Durable Ownership Shape

The ownership map should store prompt configuration alongside agents, responsibilities, and supervision edges.

Minimum additional agent fields:

```ts
type OwnershipAgentPromptConfig = {
  basePolicyId: string;
  behaviorTemplateId: string;
  roleTemplateId: string;
  roleTemplateVersion: number;
  projectScope: string;
  spawnMode: "episode-local";
};
```

The exact schema can change during implementation, but the map must retain these ideas:

- prompt template identity is durable
- project-specific scope is durable
- prompt templates are versioned
- ownership-agent runtime state is still episode-local
- reinitialization replaces prompt config with the rest of the ownership map

## Durable V1 Reconciliation Model

Cartographer output and deterministic initializers should produce typed reconciliation batches. The application applies batches; it should not scrape prose from a provider transcript and guess what changed.

V1 batch shape:

```ts
type PendingOwnershipMapReconciliationBatch = {
  pendingBatchId: string;
  projectId: string;
  baseMapVersion: number | null;
  activeCartographerConversationId: string;
  mode: "patch" | "replace";
  source: "deterministic-initializer" | "manual-json" | "cartographer-structured-output";
  reason:
    | "initialize"
    | "reinitialize"
    | "user-correction"
    | "unowned-file"
    | "overlapping-owners"
    | "stale-responsibility"
    | "structure-change";
  actions: OwnershipMapReconciliationAction[];
  summary: string;
  createdAt: string;
};

type CommittedOwnershipMapReconciliationBatch = {
  batchId: string;
  projectId: string;
  baseMapVersion: number | null;
  resultingMapVersion: number;
  activeCartographerConversationId: string;
  mode: "patch" | "replace";
  source: "deterministic-initializer" | "manual-json" | "cartographer-structured-output";
  reason:
    | "initialize"
    | "reinitialize"
    | "user-correction"
    | "unowned-file"
    | "overlapping-owners"
    | "stale-responsibility"
    | "structure-change";
  actions: OwnershipMapReconciliationAction[];
  summary: string;
  createdAt: string;
};

type OwnershipMapReconciliationAction =
  | { type: "create-agent"; agent: OwnershipAgent }
  | { type: "update-agent"; agentId: string; patch: Partial<OwnershipAgent>; rationale: string }
  | { type: "delete-agent"; agentId: string; rationale: string }
  | { type: "create-file-responsibility"; responsibility: FileResponsibility }
  | { type: "update-file-responsibility"; responsibilityId: string; patch: Partial<FileResponsibility>; rationale: string }
  | { type: "delete-file-responsibility"; responsibilityId: string; rationale: string }
  | { type: "create-supervision-edge"; edge: SupervisionEdge }
  | { type: "update-supervision-edge"; edgeId: string; patch: Partial<SupervisionEdge>; rationale: string }
  | { type: "delete-supervision-edge"; edgeId: string; rationale: string };
```

`mode: "replace"` is the reinitialization path. It replaces the durable ownership map only after the proposed final map validates. A failed replacement preserves the previous validated map, previous map version, and Nitro availability.

Pending batches are visible UI objects before apply. They have `pendingBatchId` and no `batchId` or `resultingMapVersion`.

Committed batches are durable audit records after apply. `batchId` and `resultingMapVersion` are server-assigned at apply time. The server rejects duplicate committed batch ids, non-monotonic versions, and any request that tries to force a resulting map version.

`baseMapVersion` is required for patching an existing map and must match the current durable map version. Initialization may use `baseMapVersion: null`. Reinitialization should record the previous version but commits a new validated version atomically. The committed `resultingMapVersion` must be exactly the previous durable version plus one.

`activeCartographerConversationId` records which marked Cartographer conversation owned the applying run. The server must reject apply requests from non-active Cartographer conversations.

Create and update agent actions must carry prompt configuration. Prompt-template ids and versions are validated before the batch can commit.

The runtime should reject any Cartographer output that:

- references unknown prompt template ids
- produces an implementation agent without active file responsibilities
- produces a management agent with invalid supervision edges
- creates active supervision cycles
- leaves dangling references after the whole batch is applied
- creates responsibilities whose executable V1 file matcher is empty
- tries to create hidden long-term per-agent memory

Batch application rules:

- preflight validates schema, action kinds, duplicate creates, prompt-template ids, active Cartographer conversation ownership, run-lock availability, stale `baseMapVersion`, duplicate committed batch ids, and version monotonicity
- the server applies all actions to an in-memory candidate map
- final-state validation checks dangling references, supervision cycles, implementation-agent responsibilities, management supervision, file matcher emptiness, and prompt config validity
- persistence writes the map version, entities, and reconciliation batch in one transaction
- subscribers receive an ordered project update only after commit
- failed batches are recorded as failed runs without partially mutating the durable map

## Lifecycle Rules

Cartographer-created ownership agents persist as definitions in the project map.

Ownership-agent runtime state does not persist across episodes. Starting a Nitro episode creates fresh ownership-agent runtime context for activated agents. That context is reused across rounds inside the same episode and discarded when the episode ends.

The only handover from one episode to a later episode is what the last round wrote into the main conversation as real messages, especially the compact final round `system` result. A later episode can read that conversation history because it belongs to the main thread, not because ownership agents retained hidden chat memory.

## Implementation Slices

## Current Coverage Gap

The current NitroMap tests protect the seeded projection scaffold. They do not prove the Cartographer source-replacement behavior in this plan.

Milestone 8 must add or replace coverage for:

- durable ownership-map reload after server restart
- failed initialization leaving `mapReadiness: not-run`
- failed reinitialization preserving the previous validated map and Nitro availability
- stale `baseMapVersion` rejection
- server-assigned batch id and monotonic map version behavior
- duplicate committed batch rejection
- project-level Cartographer run-lock enforcement
- active Cartographer conversation enforcement
- ordered subscription updates emitted only after persistence commits
- project-scoped update delivery with no cross-project leakage
- prompt-template ids, versions, project scope, and spawn mode in persisted agent prompt config
- Nitro gating from `mapReadiness`, including `mapReadiness: ready` with `cartographerRunStatus: failed`
- episode ownership-map version pinning across all rounds

Until those tests exist, the seeded projection tests should be treated as scaffold tests only. They do not make the Cartographer milestone complete.

### Slice 1: Contracts, Persistence, And Projection Builder

Add server-owned durable ownership-map storage with agents, file responsibilities, supervision edges, prompt config, and reconciliation batches.

Add a projection builder that derives contract-valid NitroMap snapshots from durable ownership data:

- resources are derived from file responsibilities and project files
- ownership edges are derived from responsibility matches
- stable layout positions are deterministic and project-scoped
- work episodes may be empty until runtime activation exists
- map readiness comes from the presence of a validated durable map

Expose a project snapshot that reads from durable ownership data through this projection builder instead of seeded projection data. The snapshot should report Nitro availability only when `mapReadiness` is `ready`.

### Slice 2: Cartographer Conversation Marker

Add a durable project conversation marker for Cartographer conversations. This must survive restart and be visible in route/state data so the UI can distinguish ordinary conversations from map-maintenance conversations.

The marker should be added through the full orchestration boundary:

- a `conversationPurpose` or equivalent field in thread/conversation create and update commands
- contract/read-model fields for shell and detail thread snapshots
- persistence migration for projected thread/conversation rows
- projector support when thread metadata changes
- shell/detail query filtering so Map Maintenance can find existing Cartographer conversations reliably

Add Map Maintenance entry points:

- open existing Cartographer conversation
- start a fresh Cartographer conversation
- insert `Initialize project map` prompt when no map exists
- insert `Reinitialize project map` prompt when a map exists

### Slice 3: Prompt Template Library

Create a NitroCode-owned prompt-template library. Store template ids and versions in code, with tests that prevent dangling references from persisted map data.

Do not copy external skill text. Write original templates that capture the required behavior.

The shared NitroMap contracts should expose durable prompt config on ownership-agent definitions before Milestone 8 can be considered complete. The contract must include prompt-template ids, role-template version, Cartographer-written project scope, and `spawnMode: "episode-local"` or equivalent.

### Slice 4: Typed Batch Apply Pipeline

Implement the typed reconciliation application boundary before wiring real LLM Cartographer generation:

1. create a deterministic initializer or manually supplied typed pending batch from the active Cartographer conversation
2. show the pending batch in Map Maintenance before apply
3. acquire the project Cartographer run lock
4. validate the proposed final map
5. assign committed batch id and resulting map version on the server
6. persist the batch atomically
7. update `mapReadiness` and `cartographerRunStatus`
8. publish an ordered NitroMap project update
9. render the applied batch in Map Maintenance history

This avoids hidden prose parsing fallbacks. A later slice can attach provider structured output from a Cartographer conversation to the same typed pending-batch boundary.

### Slice 4B: Cartographer Structured Generation

Collect bounded project evidence, send current map and evidence to the Cartographer conversation/runtime, request structured JSON output, validate it into a pending batch, and then use the same typed apply pipeline. This slice should wait until the typed batch boundary is reliable.

### Slice 5: Runtime Activation

Use the durable ownership map to activate implementation agents from file/path responsibilities during Nitro rounds. Management agents wake from child responses through supervision edges. Prompt composition should use the stored prompt config and current template library.

This slice is where ownership agents become real participants in rounds. It should not be mixed into the first persistence and Cartographer-thread slice.

Each Nitro episode must capture the `ownershipMapVersion` it starts with. All ownership-agent activation, prompt composition, responsibility matching, and trace projection inside that episode use that pinned map version across all rounds. If a reinitialization commits while an episode is running, that episode continues against its pinned map version; later episodes use the latest ready map.

## Non-Goals For The Next Work Unit

The next work unit should not implement:

- a broad responsibility-query evaluator beyond file/path matching
- mid-turn ownership-agent interruption
- separate long-term per-agent memory
- automatic map churn on every file save
- a full graph-layout engine
- hidden Cartographer runs that mutate ownership without visible Map Maintenance history

## Readiness Criteria

The Cartographer basics are ready when:

- every project can show both map readiness and Cartographer run status
- the Nitro button is enabled only for projects with a validated ownership map
- a Cartographer conversation is clearly marked and separate from ordinary main-agent conversations
- exactly one active Cartographer conversation can apply map changes for a project at a time
- initialization and reinitialization helper buttons insert explicit prompts into the Cartographer chatbox
- the first initialization flow can produce and apply a visible typed pending batch without hidden LLM transcript parsing
- reinitialization visibly replaces ownership data after validation
- Nitro episodes pin the ownership-map version used at episode start
- prompt configuration is part of durable ownership data
- project snapshots no longer rely on seeded projection data as the source of truth
- tests cover validation failure, initialization failure with no map, failed reinitialization preserving the previous validated map, stale base version rejection, server-assigned version monotonicity, duplicate batch rejection, active Cartographer conversation enforcement, project run-lock enforcement, episode ownership-map version pinning, atomic no-partial-write behavior, durable reload after server restart, prompt-template references, Nitro gating from map readiness, project isolation, ordered `nitromap.subscribeProject` updates, and project-scoped snapshot updates
