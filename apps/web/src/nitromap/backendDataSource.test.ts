import type { EnvironmentApi, NitroMapProjectSnapshot } from "@nitrocode/contracts";
import { EnvironmentId, NitroMapSnapshot, ProjectId } from "@nitrocode/contracts";
import { Schema } from "effect";
import { describe, expect, it, vi } from "vitest";

import { toNitroMapSnapshot } from "./contractAdapter";
import { createNitroMapBackendDataSource } from "./backendDataSource";
import { buildMockNitroProjectMap, buildMockNitroRouteParams } from "./mockData";
import type { NitroProjectMap } from "./types";

const params = buildMockNitroRouteParams({
  environmentId: "environment-1",
  projectId: "project-1",
});

function makeSnapshot(overrides: Partial<NitroMapProjectSnapshot> = {}): NitroMapProjectSnapshot {
  return Schema.decodeUnknownSync(NitroMapSnapshot)({
    ...toNitroMapSnapshot(buildMockNitroProjectMap(params)),
    ...overrides,
  });
}

function makeApi(
  snapshot: NitroMapProjectSnapshot,
  options: {
    readonly subscriptionEventType?: "nitromap.snapshot" | "nitromap.discontinuity";
  } = {},
): EnvironmentApi {
  return {
    terminal: {} as EnvironmentApi["terminal"],
    projects: {} as EnvironmentApi["projects"],
    filesystem: {} as EnvironmentApi["filesystem"],
    git: {} as EnvironmentApi["git"],
    orchestration: {} as EnvironmentApi["orchestration"],
    nitromap: {
      getProjectSnapshot: vi.fn(async () => snapshot),
      subscribeProject: vi.fn((input, listener) => {
        listener({
          type: options.subscriptionEventType ?? "nitromap.snapshot",
          environmentId: input.environmentId,
          projectId: input.projectId,
          sequence: 1,
          projectVersion: snapshot.version,
          emittedAt: snapshot.generatedAt,
          ...(options.subscriptionEventType === "nitromap.discontinuity"
            ? { reason: "test discontinuity" }
            : {}),
          snapshot,
        });
        return () => undefined;
      }),
    },
  };
}

describe("createNitroMapBackendDataSource", () => {
  it("returns map snapshots even before the Cartographer is ready", async () => {
    const source = createNitroMapBackendDataSource(
      makeApi(
        makeSnapshot({
          mapMaintenance: {
            cartographerStatus: "running",
            lastCheckedAt: null,
            actions: [],
          },
        }),
      ),
    );

    await expect(source.getProjectMap(params)).resolves.toMatchObject({
      maintenance: {
        cartographerStatus: "running",
      },
    });
  });

  it("maps snapshot subscription events into UI map events", () => {
    const source = createNitroMapBackendDataSource(makeApi(makeSnapshot()));
    const events: unknown[] = [];

    source.subscribeProjectMap(
      {
        environmentId: EnvironmentId.make("environment-1"),
        projectId: ProjectId.make("project-1"),
      },
      (event) => events.push(event),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "snapshot",
      sequence: 1,
      projectVersion: 1,
    });
  });

  it("projects optimistic local work episodes through the data source", async () => {
    const optimisticEpisode = {
      ...buildMockNitroProjectMap(params).workEpisodes[0]!,
      id: "optimistic-episode",
    };
    let optimisticEpisodes: readonly (typeof optimisticEpisode)[] = [];
    const optimisticListeners: (() => void)[] = [];
    const api = makeApi(makeSnapshot());
    const source = createNitroMapBackendDataSource(api, {
      getOptimisticWorkEpisodes: () => optimisticEpisodes,
      subscribeOptimisticWorkEpisodes: (_params, listener) => {
        optimisticListeners.push(listener);
        return () => {
          optimisticListeners.splice(optimisticListeners.indexOf(listener), 1);
        };
      },
    });
    const events: unknown[] = [];

    optimisticEpisodes = [optimisticEpisode];
    await expect(source.getProjectMap(params)).resolves.toSatisfy((map: NitroProjectMap) =>
      map.workEpisodes.some((episode) => episode.id === optimisticEpisode.id),
    );
    optimisticEpisodes = [];
    source.subscribeProjectMap(params, (event) => events.push(event));
    optimisticEpisodes = [optimisticEpisode];
    optimisticListeners[0]?.();

    expect(api.nitromap.subscribeProject).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ kind: "snapshot" });
    const event = events[1] as { map: { workEpisodes: { id: string }[] } };
    expect(event.map.workEpisodes.some((episode) => episode.id === optimisticEpisode.id)).toBe(
      true,
    );
  });

  it("lets backend work episodes replace optimistic episodes with the same id", async () => {
    const backendEpisode = buildMockNitroProjectMap(params).workEpisodes[0]!;
    const optimisticEpisode = {
      ...backendEpisode,
      title: "Stale optimistic title",
    };
    const source = createNitroMapBackendDataSource(makeApi(makeSnapshot()), {
      getOptimisticWorkEpisodes: () => [optimisticEpisode],
    });

    const map = await source.getProjectMap(params);

    expect(map.workEpisodes.filter((episode) => episode.id === backendEpisode.id)).toEqual([
      expect.objectContaining({ title: backendEpisode.title }),
    ]);
  });

  it("maps unavailable subscription snapshots into snapshot events with Cartographer status", () => {
    const source = createNitroMapBackendDataSource(
      makeApi(
        makeSnapshot({
          mapMaintenance: {
            cartographerStatus: "not-run",
            lastCheckedAt: null,
            actions: [],
          },
        }),
      ),
    );
    const events: unknown[] = [];

    source.subscribeProjectMap(params, (event) => events.push(event));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "snapshot",
      sequence: 1,
      projectVersion: 1,
      map: {
        maintenance: {
          cartographerStatus: "not-run",
        },
      },
    });
  });

  it("keeps running and failed Cartographer snapshots as map snapshots", () => {
    const events: unknown[] = [];

    createNitroMapBackendDataSource(
      makeApi(
        makeSnapshot({
          mapMaintenance: {
            cartographerStatus: "running",
            lastCheckedAt: null,
            actions: [],
          },
        }),
      ),
    ).subscribeProjectMap(params, (event) => events.push(event));
    createNitroMapBackendDataSource(
      makeApi(
        makeSnapshot({
          mapMaintenance: {
            cartographerStatus: "failed",
            lastCheckedAt: null,
            actions: [],
          },
        }),
      ),
    ).subscribeProjectMap(params, (event) => events.push(event));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "snapshot",
      map: { maintenance: { cartographerStatus: "running" } },
    });
    expect(events[1]).toMatchObject({
      kind: "snapshot",
      map: { maintenance: { cartographerStatus: "failed" } },
    });
  });

  it("maps stale subscription events into stale UI events", () => {
    const snapshot = makeSnapshot();
    const api = makeApi(snapshot);
    vi.mocked(api.nitromap.subscribeProject).mockImplementation((input, listener) => {
      listener({
        type: "nitromap.stale",
        environmentId: input.environmentId,
        projectId: input.projectId,
        sequence: 1,
        projectVersion: snapshot.version,
        emittedAt: snapshot.generatedAt,
        reason: "No newer events.",
      });
      return () => undefined;
    });
    const source = createNitroMapBackendDataSource(api);
    const events: unknown[] = [];

    source.subscribeProjectMap(params, (event) => events.push(event));

    expect(events).toEqual([
      {
        kind: "stale",
        reason: "No newer events.",
        sequence: 1,
        projectVersion: 1,
      },
    ]);
  });

  it("maps subscription errors into error UI events", () => {
    const snapshot = makeSnapshot();
    const api = makeApi(snapshot);
    vi.mocked(api.nitromap.subscribeProject).mockImplementation((_input, _listener, options) => {
      options?.onError?.(new Error("projection unavailable"));
      return () => undefined;
    });
    const source = createNitroMapBackendDataSource(api);
    const events: unknown[] = [];

    source.subscribeProjectMap(params, (event) => events.push(event));

    expect(events).toEqual([
      {
        kind: "error",
        message: "projection unavailable",
      },
    ]);
  });

  it("uses the authoritative fallback snapshot from subscription discontinuity events", async () => {
    const staleSnapshot = makeSnapshot({ version: 1 });
    const api = makeApi(staleSnapshot, {
      subscriptionEventType: "nitromap.discontinuity",
    });
    const source = createNitroMapBackendDataSource(api);
    const events: unknown[] = [];

    source.subscribeProjectMap(params, (event) => events.push(event));

    await vi.waitFor(() => {
      expect(events).toHaveLength(1);
    });
    expect(api.nitromap.getProjectSnapshot).not.toHaveBeenCalled();
    expect(events[0]).toMatchObject({
      kind: "snapshot",
      sequence: 1,
      projectVersion: 1,
    });
  });
});
