import type { EnvironmentId, MessageId, ProjectId, ThreadId } from "@t3tools/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createMemoryStorage } from "../lib/storage";
import type { NitroWorkEpisodeSummary } from "./types";

export const NITRO_WORK_EPISODE_STORAGE_KEY = "t3code:nitro-work-episodes:v1";

const emptyEpisodes: NitroWorkEpisodeSummary[] = [];

export interface StartNitroEpisodeInput {
  episodeId: string;
  roundId: string;
  environmentId: EnvironmentId;
  projectId: ProjectId;
  conversationThreadId: ThreadId;
  startedFromMessageId: MessageId;
  title: string;
  prompt: string;
  transcriptRoute: string;
  createdAt: string;
}

export interface FinishNitroEpisodeInput {
  environmentId: EnvironmentId;
  projectId: ProjectId;
  episodeId: string;
  resultMessageId: MessageId;
  completedAt: string;
  status: "completed" | "failed" | "aborted";
}

export interface NitroWorkEpisodeStoreState {
  episodesByProjectKey: Record<string, NitroWorkEpisodeSummary[]>;
  startEpisode: (input: StartNitroEpisodeInput) => NitroWorkEpisodeSummary;
  finishEpisode: (input: FinishNitroEpisodeInput) => void;
  discardEpisode: (input: {
    environmentId: EnvironmentId;
    projectId: ProjectId;
    episodeId: string;
  }) => void;
  clearEpisodesForTests: () => void;
}

export const nitroProjectKey = (environmentId: EnvironmentId, projectId: ProjectId) =>
  `${environmentId}:${projectId}`;

export function getNitroEpisodesForProject(
  state: Pick<NitroWorkEpisodeStoreState, "episodesByProjectKey">,
  environmentId: EnvironmentId,
  projectId: ProjectId,
): NitroWorkEpisodeSummary[] {
  return state.episodesByProjectKey[nitroProjectKey(environmentId, projectId)] ?? emptyEpisodes;
}

export function getRunningNitroEpisodeForConversation(
  state: Pick<NitroWorkEpisodeStoreState, "episodesByProjectKey">,
  input: {
    environmentId: EnvironmentId;
    projectId: ProjectId;
    conversationThreadId: ThreadId;
  },
): NitroWorkEpisodeSummary | null {
  return (
    getNitroEpisodesForProject(state, input.environmentId, input.projectId).find(
      (episode) =>
        episode.conversationThreadId === input.conversationThreadId &&
        (episode.status === "running" || episode.status === "blocked"),
    ) ?? null
  );
}

export const useNitroWorkEpisodeStore = create<NitroWorkEpisodeStoreState>()(
  persist(
    (set, get) => ({
      episodesByProjectKey: {},
      startEpisode: (input) => {
        const projectKey = nitroProjectKey(input.environmentId, input.projectId);
        const episode: NitroWorkEpisodeSummary = {
          id: input.episodeId,
          environmentId: input.environmentId,
          projectId: input.projectId,
          conversationThreadId: input.conversationThreadId,
          startedFromMessageId: input.startedFromMessageId,
          mainAgent: {
            label: "Conversation main agent",
            status: "working",
          },
          title: input.title,
          status: "running",
          backingThreadId: input.conversationThreadId,
          transcriptRoute: input.transcriptRoute,
          latestUserMessage: input.prompt,
          blockingItems: [],
          rounds: [
            {
              id: input.roundId,
              episodeId: input.episodeId,
              index: 1,
              title: "Nitro round",
              status: "running",
              startedByUserMessage: input.prompt,
              resultMessageId: null,
              startedAt: input.createdAt,
              completedAt: null,
              traces: [],
              invocations: [],
            },
          ],
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        };
        set((state) => ({
          episodesByProjectKey: {
            ...state.episodesByProjectKey,
            [projectKey]: [
              episode,
              ...(state.episodesByProjectKey[projectKey] ?? []).filter(
                (entry) => entry.id !== input.episodeId,
              ),
            ],
          },
        }));
        return episode;
      },
      finishEpisode: (input) => {
        const projectKey = nitroProjectKey(input.environmentId, input.projectId);
        const existing = get().episodesByProjectKey[projectKey] ?? emptyEpisodes;
        set({
          episodesByProjectKey: {
            ...get().episodesByProjectKey,
            [projectKey]: existing.map((episode) => {
              if (episode.id !== input.episodeId) return episode;
              return Object.assign({}, episode, {
                status: input.status,
                mainAgent: Object.assign({}, episode.mainAgent, {
                  status: input.status,
                }),
                updatedAt: input.completedAt,
                rounds: episode.rounds.map((round, index) =>
                  index === 0
                    ? Object.assign({}, round, {
                        status: input.status,
                        resultMessageId: input.resultMessageId,
                        completedAt: input.completedAt,
                      })
                    : round,
                ),
              });
            }),
          },
        });
      },
      discardEpisode: (input) => {
        const projectKey = nitroProjectKey(input.environmentId, input.projectId);
        const existing = get().episodesByProjectKey[projectKey] ?? emptyEpisodes;
        set({
          episodesByProjectKey: {
            ...get().episodesByProjectKey,
            [projectKey]: existing.filter((episode) => episode.id !== input.episodeId),
          },
        });
      },
      clearEpisodesForTests: () => set({ episodesByProjectKey: {} }),
    }),
    {
      name: NITRO_WORK_EPISODE_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof localStorage !== "undefined" ? localStorage : createMemoryStorage(),
      ),
      version: 1,
      partialize: (state) => ({
        episodesByProjectKey: state.episodesByProjectKey,
      }),
    },
  ),
);
