import type { EnvironmentApi, NitroMapProjectSnapshot } from "@nitrocode/contracts";

import { fromNitroMapSnapshot } from "./contractAdapter";
import type {
  NitroMapDataSource,
  NitroMapRouteParams,
  NitroProjectMap,
  NitroProjectMapSubscriptionEvent,
  NitroWorkEpisodeSummary,
} from "./types";

export interface NitroMapBackendDataSourceOptions {
  readonly getOptimisticWorkEpisodes?: (
    params: NitroMapRouteParams,
  ) => readonly NitroWorkEpisodeSummary[];
  readonly subscribeOptimisticWorkEpisodes?: (
    params: NitroMapRouteParams,
    listener: () => void,
  ) => () => void;
}

export function isNitroProjectMapAvailable(map: NitroProjectMap): boolean {
  return map.maintenance.cartographerStatus === "ready";
}

function mergeOptimisticWorkEpisodes(
  map: NitroProjectMap,
  optimisticEpisodes: readonly NitroWorkEpisodeSummary[],
): NitroProjectMap {
  if (optimisticEpisodes.length === 0) return map;
  const backendEpisodeIds = new Set(map.workEpisodes.map((episode) => episode.id));
  return {
    ...map,
    workEpisodes: [
      ...optimisticEpisodes.filter((episode) => !backendEpisodeIds.has(episode.id)),
      ...map.workEpisodes,
    ],
  };
}

function toSubscriptionEvent(input: {
  readonly snapshot: NitroMapProjectSnapshot;
  readonly sequence: number;
  readonly projectVersion: number;
  readonly optimisticWorkEpisodes: readonly NitroWorkEpisodeSummary[];
}): NitroProjectMapSubscriptionEvent {
  return {
    kind: "snapshot",
    map: mergeOptimisticWorkEpisodes(
      fromNitroMapSnapshot(input.snapshot),
      input.optimisticWorkEpisodes,
    ),
    sequence: input.sequence,
    projectVersion: input.projectVersion,
  };
}

export function createNitroMapBackendDataSource(
  api: EnvironmentApi,
  options: NitroMapBackendDataSourceOptions = {},
): NitroMapDataSource {
  return {
    getProjectMap: async (params) => {
      const snapshot = await api.nitromap.getProjectSnapshot(params);
      return mergeOptimisticWorkEpisodes(
        fromNitroMapSnapshot(snapshot),
        options.getOptimisticWorkEpisodes?.(params) ?? [],
      );
    },
    subscribeProjectMap: (params, listener) => {
      let latestSnapshotEvent: {
        snapshot: NitroMapProjectSnapshot;
        sequence: number;
        projectVersion: number;
      } | null = null;
      const emitSnapshotEvent = () => {
        if (!latestSnapshotEvent) return;
        listener(
          toSubscriptionEvent({
            ...latestSnapshotEvent,
            optimisticWorkEpisodes: options.getOptimisticWorkEpisodes?.(params) ?? [],
          }),
        );
      };
      const unsubscribeOptimistic = options.subscribeOptimisticWorkEpisodes?.(
        params,
        emitSnapshotEvent,
      );
      const unsubscribeBackend = api.nitromap.subscribeProject(
        params,
        (event) => {
          switch (event.type) {
            case "nitromap.snapshot":
              latestSnapshotEvent = {
                snapshot: event.snapshot,
                sequence: event.sequence,
                projectVersion: event.projectVersion,
              };
              emitSnapshotEvent();
              return;
            case "nitromap.discontinuity":
              latestSnapshotEvent = {
                snapshot: event.snapshot,
                sequence: event.sequence,
                projectVersion: event.projectVersion,
              };
              emitSnapshotEvent();
              return;
            case "nitromap.stale":
              listener({
                kind: "stale",
                reason: event.reason,
                sequence: event.sequence,
                projectVersion: event.projectVersion,
              });
              return;
          }
        },
        {
          onError: (error) => {
            listener({
              kind: "error",
              message: error.message.trim().length > 0 ? error.message : "NitroMap stream failed.",
            });
          },
        },
      );
      return () => {
        unsubscribeOptimistic?.();
        unsubscribeBackend();
      };
    },
  };
}
