import type {
  GitStatusLocalResult,
  GitStatusRemoteResult,
  GitStatusStreamEvent,
  NitroMapSubscriptionEvent,
} from "@nitrocode/contracts";
import { NITROMAP_WS_METHODS } from "@nitrocode/contracts";
import { Stream } from "effect";
import { describe, expect, it, vi } from "vitest";

vi.mock("./wsTransport", () => ({
  WsTransport: class WsTransport {
    dispose = vi.fn(async () => undefined);
    reconnect = vi.fn(async () => undefined);
    request = vi.fn();
    requestStream = vi.fn();
    subscribe = vi.fn(() => () => undefined);
  },
}));

import { createWsRpcClient } from "./wsRpcClient";
import { type WsTransport } from "./wsTransport";

const baseLocalStatus: GitStatusLocalResult = {
  isRepo: true,
  hasOriginRemote: true,
  isDefaultBranch: false,
  branch: "feature/demo",
  hasWorkingTreeChanges: false,
  workingTree: { files: [], insertions: 0, deletions: 0 },
};

const baseRemoteStatus: GitStatusRemoteResult = {
  hasUpstream: true,
  aheadCount: 0,
  behindCount: 0,
  pr: null,
};

describe("wsRpcClient", () => {
  it("reduces git status stream events into flat status snapshots", () => {
    const subscribe = vi.fn(<TValue>(_connect: unknown, listener: (value: TValue) => void) => {
      for (const event of [
        {
          _tag: "snapshot",
          local: baseLocalStatus,
          remote: null,
        },
        {
          _tag: "remoteUpdated",
          remote: baseRemoteStatus,
        },
        {
          _tag: "localUpdated",
          local: {
            ...baseLocalStatus,
            hasWorkingTreeChanges: true,
          },
        },
      ] satisfies GitStatusStreamEvent[]) {
        listener(event as TValue);
      }
      return () => undefined;
    });

    const transport = {
      dispose: vi.fn(async () => undefined),
      reconnect: vi.fn(async () => undefined),
      request: vi.fn(),
      requestStream: vi.fn(),
      subscribe,
    } satisfies Pick<
      WsTransport,
      "dispose" | "reconnect" | "request" | "requestStream" | "subscribe"
    >;

    const client = createWsRpcClient(transport as unknown as WsTransport);
    const listener = vi.fn();

    client.git.onStatus({ cwd: "/repo" }, listener);

    expect(listener.mock.calls).toEqual([
      [
        {
          ...baseLocalStatus,
          hasUpstream: false,
          aheadCount: 0,
          behindCount: 0,
          pr: null,
        },
      ],
      [
        {
          ...baseLocalStatus,
          ...baseRemoteStatus,
        },
      ],
      [
        {
          ...baseLocalStatus,
          ...baseRemoteStatus,
          hasWorkingTreeChanges: true,
        },
      ],
    ]);
  });

  it("resubscribes NitroMap streams with the latest cursor", () => {
    const subscribeInputs: unknown[] = [];
    const events = [
      {
        type: "nitromap.snapshot",
        environmentId: "environment-1",
        projectId: "project-1",
        sequence: 1,
        projectVersion: 1,
        emittedAt: "2026-04-26T00:00:00.000Z",
        snapshot: {},
      },
      {
        type: "nitromap.stale",
        environmentId: "environment-1",
        projectId: "project-1",
        sequence: 1,
        projectVersion: 1,
        emittedAt: "2026-04-26T00:00:00.000Z",
        reason: "No newer events.",
      },
    ] as NitroMapSubscriptionEvent[];
    const subscribe = vi.fn((connect: (client: any) => unknown, listener: (value: any) => void) => {
      const client = {
        [NITROMAP_WS_METHODS.subscribeProject]: (input: unknown) => {
          subscribeInputs.push(input);
          return Stream.empty;
        },
      };

      connect(client);
      listener(events[0]);
      connect(client);
      listener(events[1]);
      return () => undefined;
    });
    const transport = {
      dispose: vi.fn(async () => undefined),
      reconnect: vi.fn(async () => undefined),
      request: vi.fn(),
      requestStream: vi.fn(),
      subscribe,
    } satisfies Pick<
      WsTransport,
      "dispose" | "reconnect" | "request" | "requestStream" | "subscribe"
    >;

    const client = createWsRpcClient(transport as unknown as WsTransport);
    const listener = vi.fn();

    client.nitromap.subscribeProject(
      {
        environmentId: "environment-1" as never,
        projectId: "project-1" as never,
      },
      listener,
    );

    expect(subscribeInputs).toEqual([
      {
        environmentId: "environment-1",
        projectId: "project-1",
      },
      {
        environmentId: "environment-1",
        projectId: "project-1",
        lastSequence: 1,
        lastProjectVersion: 1,
      },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
