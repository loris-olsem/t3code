import { CommandId, MessageId } from "@nitrocode/contracts";
import { scopeThreadRef } from "@nitrocode/client-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { readEnvironmentApi } from "../environmentApi";
import { resolveNitroEpisodeCompletion } from "../components/ChatView.logic";
import { subscribeEnvironmentConnections } from "../environments/runtime";
import {
  selectThreadByRef,
  selectProjectsAcrossEnvironments,
  selectThreadsAcrossEnvironments,
  useStore,
} from "../store";
import { getNitroEpisodesForProject, useNitroWorkEpisodeStore } from "./workEpisodeStore";

const NITRO_ROUND_COMPLETION_APPEND_ERROR = "Failed to append Nitro result message.";

export function NitroEpisodeCompletionCoordinator() {
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const threads = useStore(useShallow(selectThreadsAcrossEnvironments));
  const episodesByProjectKey = useNitroWorkEpisodeStore((state) => state.episodesByProjectKey);
  const finishEpisode = useNitroWorkEpisodeStore((state) => state.finishEpisode);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const threadByKey = useMemo(
    () => new Map(threads.map((thread) => [`${thread.environmentId}:${thread.id}`, thread])),
    [threads],
  );
  const inFlightRef = useRef(new Set<string>());
  const failedAttemptEnvironmentRef = useRef(new Map<string, string>());

  useEffect(
    () =>
      subscribeEnvironmentConnections((environmentId) => {
        if (environmentId) {
          for (const [attemptKey, failedEnvironmentId] of failedAttemptEnvironmentRef.current) {
            if (failedEnvironmentId === environmentId) {
              failedAttemptEnvironmentRef.current.delete(attemptKey);
            }
          }
        } else {
          failedAttemptEnvironmentRef.current.clear();
        }
        setConnectionEpoch((epoch) => epoch + 1);
      }),
    [],
  );

  useEffect(() => {
    for (const project of projects) {
      const episodes = getNitroEpisodesForProject(
        { episodesByProjectKey },
        project.environmentId,
        project.id,
      );
      for (const episode of episodes) {
        if (episode.status !== "running" && episode.status !== "blocked") continue;
        const thread = threadByKey.get(`${episode.environmentId}:${episode.conversationThreadId}`);
        const completion = resolveNitroEpisodeCompletion({
          episode,
          latestTurn: thread?.latestTurn ?? null,
        });
        if (!completion || !thread) continue;

        const firstRound = episode.rounds[0] ?? null;
        const roundId = firstRound?.id ?? "round-1";
        const completionAttemptKey = `${episode.id}:${
          episode.environmentId
        }:${episode.projectId}:${roundId}:${
          thread.latestTurn?.turnId ?? thread.latestTurn?.requestedAt ?? completion.completedAt
        }`;
        if (inFlightRef.current.has(completionAttemptKey)) continue;
        if (failedAttemptEnvironmentRef.current.has(completionAttemptKey)) continue;

        const api = readEnvironmentApi(episode.environmentId);
        if (!api) continue;

        const resultMessageId = nitroRoundCompletionMessageId({
          environmentId: episode.environmentId,
          projectId: episode.projectId,
          episodeId: episode.id,
          roundId,
        });
        const workDetailRoute = `/projects/${encodeURIComponent(
          episode.environmentId,
        )}/${encodeURIComponent(episode.projectId)}/work/${encodeURIComponent(episode.id)}`;
        inFlightRef.current.add(completionAttemptKey);
        void api.orchestration
          .dispatchCommand({
            type: "thread.nitro-round.complete",
            commandId: nitroRoundCompletionCommandId({
              environmentId: episode.environmentId,
              projectId: episode.projectId,
              episodeId: episode.id,
              roundId,
            }),
            threadId: episode.conversationThreadId,
            messageId: resultMessageId,
            episodeId: episode.id,
            roundIndex: 1,
            status: completion.status,
            workDetailRoute,
            createdAt: completion.completedAt,
          })
          .then(() => {
            const threadRef = scopeThreadRef(episode.environmentId, episode.conversationThreadId);
            if (
              selectThreadByRef(useStore.getState(), threadRef)?.error ===
              NITRO_ROUND_COMPLETION_APPEND_ERROR
            ) {
              useStore.getState().setErrorByRef(threadRef, null);
            }
            finishEpisode({
              environmentId: episode.environmentId,
              projectId: episode.projectId,
              episodeId: episode.id,
              resultMessageId,
              completedAt: completion.completedAt,
              status: completion.status,
            });
          })
          .catch(() => {
            failedAttemptEnvironmentRef.current.set(completionAttemptKey, episode.environmentId);
            useStore
              .getState()
              .setErrorByRef(
                scopeThreadRef(episode.environmentId, episode.conversationThreadId),
                NITRO_ROUND_COMPLETION_APPEND_ERROR,
              );
          })
          .finally(() => {
            inFlightRef.current.delete(completionAttemptKey);
          });
      }
    }
  }, [connectionEpoch, episodesByProjectKey, finishEpisode, projects, threadByKey]);

  return null;
}

function nitroRoundCompletionCommandId(input: {
  environmentId: string;
  projectId: string;
  episodeId: string;
  roundId: string;
}) {
  return CommandId.make(
    `nitro-round-complete:${input.environmentId}:${input.projectId}:${input.episodeId}:${input.roundId}`,
  );
}

function nitroRoundCompletionMessageId(input: {
  environmentId: string;
  projectId: string;
  episodeId: string;
  roundId: string;
}) {
  return MessageId.make(
    `nitro-round-result:${input.environmentId}:${input.projectId}:${input.episodeId}:${input.roundId}`,
  );
}
