import { EnvironmentId, MessageId, ProjectId, ThreadId } from "@nitrocode/contracts";
import { describe, expect, it, beforeEach } from "vitest";

import {
  getNitroEpisodesForProject,
  getRunningNitroEpisodeForConversation,
  useNitroWorkEpisodeStore,
} from "./workEpisodeStore";

const environmentId = EnvironmentId.make("env-test");
const projectId = ProjectId.make("project-test");
const threadId = ThreadId.make("thread-test");

describe("nitro work episode store", () => {
  beforeEach(() => {
    useNitroWorkEpisodeStore.getState().clearEpisodesForTests();
  });

  it("keeps one conversation able to create many distinct episodes", () => {
    const store = useNitroWorkEpisodeStore.getState();
    store.startEpisode({
      episodeId: "episode-1",
      roundId: "round-1",
      environmentId,
      projectId,
      conversationThreadId: threadId,
      startedFromMessageId: MessageId.make("message-1"),
      title: "First episode",
      prompt: "first prompt",
      transcriptRoute: "/env-test/thread-test",
      createdAt: "2026-04-25T09:00:00.000Z",
    });
    store.finishEpisode({
      environmentId,
      projectId,
      episodeId: "episode-1",
      resultMessageId: MessageId.make("result-1"),
      completedAt: "2026-04-25T09:01:00.000Z",
      status: "completed",
    });
    store.startEpisode({
      episodeId: "episode-2",
      roundId: "round-2",
      environmentId,
      projectId,
      conversationThreadId: threadId,
      startedFromMessageId: MessageId.make("message-2"),
      title: "Second episode",
      prompt: "second prompt",
      transcriptRoute: "/env-test/thread-test",
      createdAt: "2026-04-25T09:02:00.000Z",
    });

    const episodes = getNitroEpisodesForProject(
      useNitroWorkEpisodeStore.getState(),
      environmentId,
      projectId,
    );

    expect(episodes.map((episode) => episode.id)).toEqual(["episode-2", "episode-1"]);
    expect(new Set(episodes.map((episode) => episode.conversationThreadId))).toEqual(
      new Set([threadId]),
    );
  });

  it("selects only the currently running episode for regular-submit blocking", () => {
    const store = useNitroWorkEpisodeStore.getState();
    store.startEpisode({
      episodeId: "episode-running",
      roundId: "round-running",
      environmentId,
      projectId,
      conversationThreadId: threadId,
      startedFromMessageId: MessageId.make("message-running"),
      title: "Running episode",
      prompt: "prompt",
      transcriptRoute: "/env-test/thread-test",
      createdAt: "2026-04-25T09:00:00.000Z",
    });

    expect(
      getRunningNitroEpisodeForConversation(useNitroWorkEpisodeStore.getState(), {
        environmentId,
        projectId,
        conversationThreadId: threadId,
      })?.id,
    ).toBe("episode-running");

    store.finishEpisode({
      environmentId,
      projectId,
      episodeId: "episode-running",
      resultMessageId: MessageId.make("result-running"),
      completedAt: "2026-04-25T09:01:00.000Z",
      status: "completed",
    });

    expect(
      getRunningNitroEpisodeForConversation(useNitroWorkEpisodeStore.getState(), {
        environmentId,
        projectId,
        conversationThreadId: threadId,
      }),
    ).toBeNull();
  });
});
