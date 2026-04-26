import type { EnvironmentId, EnvironmentApi } from "@nitrocode/contracts";
import { useSyncExternalStore } from "react";

import type { WsRpcClient } from "./rpc/wsRpcClient";
import { readEnvironmentConnection, subscribeEnvironmentConnections } from "./environments/runtime";

const environmentApiOverridesForTests = new Map<EnvironmentId, EnvironmentApi>();
const cachedEnvironmentApis = new WeakMap<WsRpcClient, EnvironmentApi>();

export function createEnvironmentApi(rpcClient: WsRpcClient): EnvironmentApi {
  return {
    terminal: {
      open: (input) => rpcClient.terminal.open(input as never),
      write: (input) => rpcClient.terminal.write(input as never),
      resize: (input) => rpcClient.terminal.resize(input as never),
      clear: (input) => rpcClient.terminal.clear(input as never),
      restart: (input) => rpcClient.terminal.restart(input as never),
      close: (input) => rpcClient.terminal.close(input as never),
      onEvent: (callback) => rpcClient.terminal.onEvent(callback),
    },
    projects: {
      searchEntries: rpcClient.projects.searchEntries,
      writeFile: rpcClient.projects.writeFile,
    },
    filesystem: {
      browse: rpcClient.filesystem.browse,
    },
    git: {
      pull: rpcClient.git.pull,
      refreshStatus: rpcClient.git.refreshStatus,
      onStatus: (input, callback, options) => rpcClient.git.onStatus(input, callback, options),
      listBranches: rpcClient.git.listBranches,
      createWorktree: rpcClient.git.createWorktree,
      removeWorktree: rpcClient.git.removeWorktree,
      createBranch: rpcClient.git.createBranch,
      checkout: rpcClient.git.checkout,
      init: rpcClient.git.init,
      resolvePullRequest: rpcClient.git.resolvePullRequest,
      preparePullRequestThread: rpcClient.git.preparePullRequestThread,
    },
    orchestration: {
      dispatchCommand: rpcClient.orchestration.dispatchCommand,
      getTurnDiff: rpcClient.orchestration.getTurnDiff,
      getFullThreadDiff: rpcClient.orchestration.getFullThreadDiff,
      subscribeShell: (callback, options) =>
        rpcClient.orchestration.subscribeShell(callback, options),
      subscribeThread: (input, callback, options) =>
        rpcClient.orchestration.subscribeThread(input, callback, options),
    },
    nitromap: {
      getProjectSnapshot: rpcClient.nitromap.getProjectSnapshot,
      subscribeProject: (input, callback, options) =>
        rpcClient.nitromap.subscribeProject(input, callback, options),
    },
  };
}

export function readEnvironmentApi(environmentId: EnvironmentId): EnvironmentApi | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (!environmentId) {
    return undefined;
  }

  const overriddenApi = environmentApiOverridesForTests.get(environmentId);
  if (overriddenApi) {
    return overriddenApi;
  }

  const connection = readEnvironmentConnection(environmentId);
  if (!connection) {
    return undefined;
  }

  const cachedApi = cachedEnvironmentApis.get(connection.client);
  if (cachedApi) {
    return cachedApi;
  }

  const api = createEnvironmentApi(connection.client);
  cachedEnvironmentApis.set(connection.client, api);
  return api;
}

export function ensureEnvironmentApi(environmentId: EnvironmentId): EnvironmentApi {
  const api = readEnvironmentApi(environmentId);
  if (!api) {
    throw new Error(`Environment API not found for environment ${environmentId}`);
  }
  return api;
}

export function useEnvironmentApi(environmentId: EnvironmentId): EnvironmentApi | undefined {
  return useSyncExternalStore(
    subscribeEnvironmentConnections,
    () => readEnvironmentApi(environmentId),
    () => undefined,
  );
}

export function __setEnvironmentApiOverrideForTests(
  environmentId: EnvironmentId,
  api: EnvironmentApi,
): void {
  environmentApiOverridesForTests.set(environmentId, api);
}

export function __resetEnvironmentApiOverridesForTests(): void {
  environmentApiOverridesForTests.clear();
}
