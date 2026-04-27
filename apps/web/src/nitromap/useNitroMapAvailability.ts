import type { EnvironmentId, ProjectId } from "@nitrocode/contracts";
import { useEffect, useMemo, useState } from "react";

import { useEnvironmentApi } from "~/environmentApi";
import { createNitroMapBackendDataSource, isNitroProjectMapAvailable } from "./backendDataSource";

export type NitroMapAvailability =
  | { readonly status: "loading"; readonly available: false; readonly disabledReason: string }
  | { readonly status: "available"; readonly available: true; readonly disabledReason: null }
  | { readonly status: "unavailable"; readonly available: false; readonly disabledReason: string }
  | { readonly status: "error"; readonly available: false; readonly disabledReason: string };

export function useNitroMapAvailability(input: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId | null;
  readonly enabled: boolean;
}): NitroMapAvailability {
  const environmentApi = useEnvironmentApi(input.environmentId);
  const dataSource = useMemo(
    () =>
      input.enabled && environmentApi ? createNitroMapBackendDataSource(environmentApi) : null,
    [environmentApi, input.enabled],
  );
  const [availability, setAvailability] = useState<NitroMapAvailability>({
    status: "loading",
    available: false,
    disabledReason: "Checking Cartographer status.",
  });

  useEffect(() => {
    let disposed = false;
    setAvailability({
      status: "loading",
      available: false,
      disabledReason: "Checking Cartographer status.",
    });
    if (!dataSource || !input.projectId) {
      return () => {
        disposed = true;
      };
    }

    const unsubscribe = dataSource.subscribeProjectMap(
      {
        environmentId: input.environmentId,
        projectId: input.projectId,
      },
      (event) => {
        if (!disposed) {
          switch (event.kind) {
            case "snapshot":
              setAvailability(
                isNitroProjectMapAvailable(event.map)
                  ? { status: "available", available: true, disabledReason: null }
                  : {
                      status: "unavailable",
                      available: false,
                      disabledReason: disabledReasonForCartographerStatus(
                        event.map.maintenance.cartographerStatus,
                      ),
                    },
              );
              return;
            case "stale":
              return;
            case "error":
              setAvailability({
                status: "error",
                available: false,
                disabledReason: `NitroMap availability check failed: ${event.message}`,
              });
              return;
          }
        }
      },
    );

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [dataSource, input.environmentId, input.projectId]);

  return availability;
}

function disabledReasonForCartographerStatus(status: "not-run" | "ready" | "running" | "failed") {
  switch (status) {
    case "ready":
      return "Cartographer has produced a project ownership map.";
    case "running":
      return "The Cartographer is still building the project ownership map.";
    case "failed":
      return "The Cartographer failed to produce a project ownership map.";
    case "not-run":
      return "Run the Cartographer before starting a Nitro episode.";
  }
}
