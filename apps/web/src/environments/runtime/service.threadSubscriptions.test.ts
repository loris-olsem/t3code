import { QueryClient } from "@tanstack/react-query";
import {
  EnvironmentId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationShellSnapshot,
} from "@nitrocode/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSubscribeThread = vi.fn();
const mockThreadUnsubscribe = vi.fn();
const mockCreateEnvironmentConnection = vi.fn();
const mockCreateWsRpcClient = vi.fn();
const mockWaitForSavedEnvironmentRegistryHydration = vi.fn();
const mockListSavedEnvironmentRecords = vi.fn();
const mockGetSavedEnvironmentRecord = vi.fn();
const mockReadSavedEnvironmentBearerToken = vi.fn();
const mockSavedEnvironmentRegistrySubscribe = vi.fn();
const mockFetchRemoteSessionState = vi.fn();

function MockWsTransport() {
  return undefined;
}

vi.mock("../primary", () => ({
  getPrimaryKnownEnvironment: vi.fn(() => ({
    id: "env-1",
    label: "Primary environment",
    source: "window-origin",
    target: {
      httpBaseUrl: "http://127.0.0.1:3000/",
      wsBaseUrl: "ws://127.0.0.1:3000/",
    },
    environmentId: EnvironmentId.make("env-1"),
  })),
}));

vi.mock("./catalog", () => ({
  getSavedEnvironmentRecord: mockGetSavedEnvironmentRecord,
  hasSavedEnvironmentRegistryHydrated: vi.fn(() => true),
  listSavedEnvironmentRecords: mockListSavedEnvironmentRecords,
  persistSavedEnvironmentRecord: vi.fn(),
  readSavedEnvironmentBearerToken: mockReadSavedEnvironmentBearerToken,
  removeSavedEnvironmentBearerToken: vi.fn(),
  useSavedEnvironmentRegistryStore: {
    subscribe: mockSavedEnvironmentRegistrySubscribe,
    getState: () => ({
      upsert: vi.fn(),
      remove: vi.fn(),
      markConnected: vi.fn(),
    }),
  },
  useSavedEnvironmentRuntimeStore: {
    getState: () => ({
      ensure: vi.fn(),
      patch: vi.fn(),
      clear: vi.fn(),
    }),
  },
  waitForSavedEnvironmentRegistryHydration: mockWaitForSavedEnvironmentRegistryHydration,
  writeSavedEnvironmentBearerToken: vi.fn(),
}));

vi.mock("../remote/api", () => ({
  bootstrapRemoteBearerSession: vi.fn(),
  fetchRemoteEnvironmentDescriptor: vi.fn(),
  fetchRemoteSessionState: mockFetchRemoteSessionState,
  resolveRemoteWebSocketConnectionUrl: vi.fn(() => "ws://remote.example.com/"),
}));

vi.mock("./connection", () => ({
  createEnvironmentConnection: mockCreateEnvironmentConnection,
}));

vi.mock("../../rpc/wsRpcClient", () => ({
  createWsRpcClient: mockCreateWsRpcClient,
}));

vi.mock("../../rpc/wsTransport", () => ({
  WsTransport: MockWsTransport,
}));

function makeThreadShellSnapshot(params: {
  readonly threadId: ThreadId;
  readonly sessionStatus?:
    | "idle"
    | "starting"
    | "running"
    | "ready"
    | "interrupted"
    | "stopped"
    | "error";
  readonly hasPendingApprovals?: boolean;
  readonly hasPendingUserInput?: boolean;
  readonly hasActionableProposedPlan?: boolean;
}): OrchestrationShellSnapshot {
  const projectId = ProjectId.make("project-1");
  const turnId = TurnId.make("turn-1");

  return {
    snapshotSequence: 1,
    projects: [],
    updatedAt: "2026-04-13T00:00:00.000Z",
    threads: [
      {
        id: params.threadId,
        projectId,
        title: "Thread",
        modelSelection: {
          provider: "codex",
          model: "gpt-5-codex",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        latestTurn:
          params.sessionStatus === "running"
            ? {
                turnId,
                state: "running",
                requestedAt: "2026-04-13T00:00:00.000Z",
                startedAt: "2026-04-13T00:00:01.000Z",
                completedAt: null,
                assistantMessageId: null,
              }
            : null,
        createdAt: "2026-04-13T00:00:00.000Z",
        updatedAt: "2026-04-13T00:00:00.000Z",
        archivedAt: null,
        session: params.sessionStatus
          ? {
              threadId: params.threadId,
              status: params.sessionStatus,
              providerName: "codex",
              runtimeMode: "full-access",
              activeTurnId: params.sessionStatus === "running" ? turnId : null,
              lastError: null,
              updatedAt: "2026-04-13T00:00:00.000Z",
            }
          : null,
        latestUserMessageAt: null,
        hasPendingApprovals: params.hasPendingApprovals ?? false,
        hasPendingUserInput: params.hasPendingUserInput ?? false,
        hasActionableProposedPlan: params.hasActionableProposedPlan ?? false,
      },
    ],
  };
}

describe("retainThreadDetailSubscription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    mockThreadUnsubscribe.mockImplementation(() => undefined);
    mockSubscribeThread.mockImplementation(() => mockThreadUnsubscribe);
    mockCreateWsRpcClient.mockReturnValue({
      server: {
        getConfig: vi.fn(async () => ({
          environment: {
            environmentId: EnvironmentId.make("env-1"),
          },
        })),
      },
      orchestration: {
        subscribeThread: mockSubscribeThread,
      },
    });
    mockCreateEnvironmentConnection.mockImplementation((input) => ({
      kind: input.kind,
      environmentId: input.knownEnvironment.environmentId,
      knownEnvironment: input.knownEnvironment,
      client: input.client,
      ensureBootstrapped: vi.fn(async () => undefined),
      reconnect: vi.fn(async () => {
        input.handleShellResubscribe?.(input.knownEnvironment.environmentId);
      }),
      dispose: vi.fn(async () => undefined),
    }));
    mockSavedEnvironmentRegistrySubscribe.mockReturnValue(() => undefined);
    mockWaitForSavedEnvironmentRegistryHydration.mockResolvedValue(undefined);
    mockListSavedEnvironmentRecords.mockReturnValue([]);
    mockGetSavedEnvironmentRecord.mockReturnValue(null);
    mockReadSavedEnvironmentBearerToken.mockResolvedValue("saved-token");
    mockFetchRemoteSessionState.mockResolvedValue({
      authenticated: true,
      role: "owner",
    });
  });

  afterEach(async () => {
    const { resetEnvironmentServiceForTests } = await import("./service");
    await resetEnvironmentServiceForTests();
    vi.useRealTimers();
  });

  it("keeps thread detail subscriptions warm across releases until idle eviction", async () => {
    const {
      retainThreadDetailSubscription,
      startEnvironmentConnectionService,
      resetEnvironmentServiceForTests,
    } = await import("./service");

    const stop = startEnvironmentConnectionService(new QueryClient());
    const environmentId = EnvironmentId.make("env-1");
    const threadId = ThreadId.make("thread-1");

    const releaseFirst = retainThreadDetailSubscription(environmentId, threadId);
    expect(mockSubscribeThread).toHaveBeenCalledTimes(1);

    releaseFirst();
    expect(mockThreadUnsubscribe).not.toHaveBeenCalled();

    const releaseSecond = retainThreadDetailSubscription(environmentId, threadId);
    expect(mockSubscribeThread).toHaveBeenCalledTimes(1);

    releaseSecond();
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(mockThreadUnsubscribe).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(28 * 60 * 1000);
    expect(mockThreadUnsubscribe).toHaveBeenCalledTimes(1);

    stop();
    await resetEnvironmentServiceForTests();
  });

  it("keeps non-idle thread detail subscriptions attached until the thread becomes idle", async () => {
    const {
      retainThreadDetailSubscription,
      startEnvironmentConnectionService,
      resetEnvironmentServiceForTests,
    } = await import("./service");

    const stop = startEnvironmentConnectionService(new QueryClient());
    const environmentId = EnvironmentId.make("env-1");
    const threadId = ThreadId.make("thread-active");

    const connectionInput = mockCreateEnvironmentConnection.mock.calls[0]?.[0];
    expect(connectionInput).toBeDefined();

    connectionInput.syncShellSnapshot(
      makeThreadShellSnapshot({
        threadId,
        sessionStatus: "ready",
        hasPendingApprovals: true,
      }),
      environmentId,
    );

    const release = retainThreadDetailSubscription(environmentId, threadId);
    expect(mockSubscribeThread).toHaveBeenCalledTimes(1);

    release();
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(mockThreadUnsubscribe).not.toHaveBeenCalled();

    connectionInput.applyShellEvent(
      {
        kind: "thread-upserted",
        sequence: 2,
        thread: makeThreadShellSnapshot({
          threadId,
          sessionStatus: "idle",
        }).threads[0]!,
      },
      environmentId,
    );

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(mockThreadUnsubscribe).toHaveBeenCalledTimes(1);

    stop();
    await resetEnvironmentServiceForTests();
  });

  it("allows a larger idle cache before capacity eviction starts", async () => {
    const {
      retainThreadDetailSubscription,
      startEnvironmentConnectionService,
      resetEnvironmentServiceForTests,
    } = await import("./service");

    const stop = startEnvironmentConnectionService(new QueryClient());
    const environmentId = EnvironmentId.make("env-1");

    for (let index = 0; index < 12; index += 1) {
      const release = retainThreadDetailSubscription(
        environmentId,
        ThreadId.make(`thread-${index + 1}`),
      );
      release();
    }

    expect(mockThreadUnsubscribe).not.toHaveBeenCalled();

    stop();
    await resetEnvironmentServiceForTests();
  });

  it("disposes cached thread detail subscriptions when the environment service resets", async () => {
    const {
      retainThreadDetailSubscription,
      startEnvironmentConnectionService,
      resetEnvironmentServiceForTests,
    } = await import("./service");

    const stop = startEnvironmentConnectionService(new QueryClient());
    const environmentId = EnvironmentId.make("env-1");
    const threadId = ThreadId.make("thread-2");

    const release = retainThreadDetailSubscription(environmentId, threadId);
    release();

    await resetEnvironmentServiceForTests();
    expect(mockThreadUnsubscribe).toHaveBeenCalledTimes(1);

    stop();
  });

  it("notifies environment connection subscribers when an existing saved environment reconnects", async () => {
    const {
      reconnectSavedEnvironment,
      resetEnvironmentServiceForTests,
      startEnvironmentConnectionService,
      subscribeEnvironmentConnections,
    } = await import("./service");

    const savedEnvironmentId = EnvironmentId.make("env-saved");
    const savedRecord = {
      environmentId: savedEnvironmentId,
      label: "Saved environment",
      httpBaseUrl: "https://remote.example.com/",
      wsBaseUrl: "wss://remote.example.com/",
      createdAt: "2026-04-13T00:00:00.000Z",
      lastConnectedAt: null,
    };
    mockListSavedEnvironmentRecords.mockReturnValue([savedRecord]);
    mockGetSavedEnvironmentRecord.mockReturnValue(savedRecord);

    const observedEnvironmentIds: Array<EnvironmentId | undefined> = [];
    const unsubscribe = subscribeEnvironmentConnections((environmentId) => {
      observedEnvironmentIds.push(environmentId);
    });
    const stop = startEnvironmentConnectionService(new QueryClient());

    await vi.waitFor(() => {
      expect(mockCreateEnvironmentConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "saved",
          knownEnvironment: expect.objectContaining({
            environmentId: savedEnvironmentId,
          }),
        }),
      );
    });

    observedEnvironmentIds.length = 0;
    await reconnectSavedEnvironment(savedEnvironmentId);

    expect(observedEnvironmentIds).toEqual([savedEnvironmentId]);

    unsubscribe();
    stop();
    await resetEnvironmentServiceForTests();
  });

  it("notifies environment connection subscribers when the primary environment reconnects", async () => {
    const {
      reconnectPrimaryEnvironment,
      resetEnvironmentServiceForTests,
      startEnvironmentConnectionService,
      subscribeEnvironmentConnections,
    } = await import("./service");

    const observedEnvironmentIds: Array<EnvironmentId | undefined> = [];
    const unsubscribe = subscribeEnvironmentConnections((environmentId) => {
      observedEnvironmentIds.push(environmentId);
    });
    const stop = startEnvironmentConnectionService(new QueryClient());

    await vi.waitFor(() => {
      expect(mockCreateEnvironmentConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "primary",
          knownEnvironment: expect.objectContaining({
            environmentId: EnvironmentId.make("env-1"),
          }),
        }),
      );
    });

    observedEnvironmentIds.length = 0;
    await reconnectPrimaryEnvironment();

    expect(observedEnvironmentIds).toEqual([EnvironmentId.make("env-1")]);

    unsubscribe();
    stop();
    await resetEnvironmentServiceForTests();
  });

  it("notifies environment connection subscribers when the shell stream resubscribes", async () => {
    const {
      resetEnvironmentServiceForTests,
      startEnvironmentConnectionService,
      subscribeEnvironmentConnections,
    } = await import("./service");

    const environmentId = EnvironmentId.make("env-1");
    const observedEnvironmentIds: Array<EnvironmentId | undefined> = [];
    const unsubscribe = subscribeEnvironmentConnections((nextEnvironmentId) => {
      observedEnvironmentIds.push(nextEnvironmentId);
    });
    const stop = startEnvironmentConnectionService(new QueryClient());

    await vi.waitFor(() => {
      expect(mockCreateEnvironmentConnection).toHaveBeenCalled();
    });
    const connectionInput = mockCreateEnvironmentConnection.mock.calls[0]?.[0];
    expect(connectionInput?.handleShellResubscribe).toBeTypeOf("function");

    observedEnvironmentIds.length = 0;
    connectionInput.handleShellResubscribe(environmentId);

    expect(observedEnvironmentIds).toEqual([environmentId]);

    unsubscribe();
    stop();
    await resetEnvironmentServiceForTests();
  });
});
