import { describe, expect, it } from "vitest";

import { buildMockNitroRouteParams, mockNitroMapDataSource } from "./mockData";

describe("mockNitroMapDataSource", () => {
  it("has an explicit unavailable project-map path for Nitro gating", () => {
    expect(
      mockNitroMapDataSource.hasProjectMap(
        buildMockNitroRouteParams({
          environmentId: "environment-1",
          projectId: "project-without-nitro-map",
        }),
      ),
    ).toBe(false);
  });
});
