import { EnvironmentId, ProjectId, type NitroMapSubscriptionEvent } from "@nitrocode/contracts";
import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";

import {
  buildSeededNitroMapSnapshot,
  decodeNitroMapProjectionSnapshot,
  NitroMapProjection,
} from "../Services/NitroMapProjection.ts";
import { NitroMapProjectionLive } from "./NitroMapProjection.ts";

const envA = EnvironmentId.make("environment-a");
const envB = EnvironmentId.make("environment-b");
const projectA = ProjectId.make("project-a");
const projectB = ProjectId.make("project-b");

describe("NitroMapProjectionLive", () => {
  it("serves a valid project-scoped seeded snapshot without Cartographer readiness", async () => {
    const snapshot = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        return yield* projection.getProjectSnapshot({
          environmentId: envA,
          projectId: projectA,
        });
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(snapshot.environmentId).toBe(envA);
    expect(snapshot.projectId).toBe(projectA);
    expect(snapshot.mapMaintenance.cartographerStatus).toBe("not-run");
    expect(snapshot.agents.length).toBeGreaterThan(0);
    expect(
      snapshot.agents.every((agent) => agent.agentId.includes("environment-a:project-a")),
    ).toBe(true);
  });

  it("keeps seeded projection ids isolated per project", async () => {
    const [left, right] = await Effect.runPromise(
      Effect.all(
        [
          decodeNitroMapProjectionSnapshot(
            buildSeededNitroMapSnapshot({ environmentId: envA, projectId: projectA }),
          ),
          decodeNitroMapProjectionSnapshot(
            buildSeededNitroMapSnapshot({ environmentId: envB, projectId: projectB }),
          ),
        ],
        { concurrency: 2 },
      ),
    );

    expect(left.agents[0]?.agentId).not.toBe(right.agents[0]?.agentId);
    expect(left.workEpisodes[0]?.episodeId).not.toBe(right.workEpisodes[0]?.episodeId);
  });

  it("rejects invalid projection snapshots before serving them", async () => {
    const invalidSnapshot = {
      ...(buildSeededNitroMapSnapshot({ environmentId: envA, projectId: projectA }) as Record<
        string,
        unknown
      >),
      responsibilities: [
        {
          responsibilityId: "orphan-responsibility",
          agentId: "missing-agent",
          label: "Broken responsibility",
          status: "owned",
          query: {
            kind: "path-glob",
            patterns: ["apps/**"],
          },
          rationale: "Test-only invalid projection.",
        },
      ],
    };

    await expect(
      Effect.runPromise(decodeNitroMapProjectionSnapshot(invalidSnapshot)),
    ).rejects.toThrow(/Invalid NitroMap projection snapshot/);
  });

  it("emits a snapshot event on fresh subscription", async () => {
    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        return yield* projection
          .subscribeProject({ environmentId: envA, projectId: projectA })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nitromap.snapshot",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("emits a discontinuity snapshot when a resume cursor cannot be proven continuous", async () => {
    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        return yield* projection
          .subscribeProject({
            environmentId: envA,
            projectId: projectA,
            lastSequence: 99,
            lastProjectVersion: 1,
          })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nitromap.discontinuity",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("rejects incomplete resume cursors at the projection boundary", async () => {
    await expect(
      Effect.runPromise(
        Effect.gen(function* () {
          const projection = yield* NitroMapProjection;
          return yield* projection
            .subscribeProject({
              environmentId: envA,
              projectId: projectA,
              lastSequence: 1,
            } as never)
            .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
        }).pipe(Effect.provide(NitroMapProjectionLive)),
      ),
    ).rejects.toThrow(/Invalid NitroMap subscription cursor/);
  });

  it("treats a discontinuity cursor as resumable", async () => {
    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        const discontinuity = yield* projection
          .subscribeProject({
            environmentId: envA,
            projectId: projectA,
            lastSequence: 99,
            lastProjectVersion: 1,
          })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
        const nextCursor = discontinuity[0]! as NitroMapSubscriptionEvent;
        return yield* projection
          .subscribeProject({
            environmentId: envA,
            projectId: projectA,
            lastSequence: nextCursor.sequence,
            lastProjectVersion: nextCursor.projectVersion,
          })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nitromap.stale",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("emits stale when a resume cursor is already current", async () => {
    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        return yield* projection
          .subscribeProject({
            environmentId: envA,
            projectId: projectA,
            lastSequence: 1,
            lastProjectVersion: 1,
          })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nitromap.stale",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("emits a discontinuity snapshot when the project version cursor does not match", async () => {
    const events = await Effect.runPromise(
      Effect.gen(function* () {
        const projection = yield* NitroMapProjection;
        return yield* projection
          .subscribeProject({
            environmentId: envA,
            projectId: projectA,
            lastSequence: 1,
            lastProjectVersion: 99,
          })
          .pipe(Stream.take(1), Stream.runCollect, Effect.map(Array.from));
      }).pipe(Effect.provide(NitroMapProjectionLive)),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nitromap.discontinuity",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("defaults seeded fixtures to a not-run Cartographer state", async () => {
    const snapshot = await Effect.runPromise(
      decodeNitroMapProjectionSnapshot(
        buildSeededNitroMapSnapshot({
          environmentId: envA,
          projectId: ProjectId.make("project-without-nitro-map"),
        }),
      ),
    );

    expect(snapshot.mapMaintenance.cartographerStatus).toBe("not-run");
    expect(snapshot.agents.length).toBeGreaterThan(0);
  });
});
