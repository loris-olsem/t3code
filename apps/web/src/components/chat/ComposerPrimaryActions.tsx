import { memo } from "react";
import { ChevronDownIcon, ChevronLeftIcon, MapIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import nitroAnimatedIconUrl from "~/assets/agent_harness_nitro_icon_animated.svg?url";
import nitroIconUrl from "~/assets/agent_harness_nitro_icon.svg?url";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { buildNitroMapRouteParams, NITRO_MAP_ROUTE_BY_VIEW } from "../../nitromap/routes";
import type { EnvironmentId, ProjectId } from "@nitrocode/contracts";

interface PendingActionState {
  questionIndex: number;
  isLastQuestion: boolean;
  canAdvance: boolean;
  isResponding: boolean;
  isComplete: boolean;
}

interface ComposerPrimaryActionsProps {
  compact: boolean;
  pendingAction: PendingActionState | null;
  isRunning: boolean;
  showPlanFollowUpPrompt: boolean;
  promptHasText: boolean;
  isSendBusy: boolean;
  isConnecting: boolean;
  isPreparingWorktree: boolean;
  hasSendableContent: boolean;
  onPreviousPendingQuestion: () => void;
  onInterrupt: () => void;
  onImplementPlanInNewThread: () => void;
}

interface NitroSubmitButtonProps {
  disabled: boolean;
  disabledReason?: string | null;
  onNitroSend: () => void;
}

interface NitroMapContextButtonProps {
  environmentId: EnvironmentId;
  projectId: ProjectId;
}

export const formatPendingPrimaryActionLabel = (input: {
  compact: boolean;
  isLastQuestion: boolean;
  isResponding: boolean;
  questionIndex: number;
}) => {
  if (input.isResponding) {
    return "Submitting...";
  }
  if (input.compact) {
    return input.isLastQuestion ? "Submit" : "Next";
  }
  if (!input.isLastQuestion) {
    return "Next question";
  }
  return input.questionIndex > 0 ? "Submit answers" : "Submit answer";
};

export const ComposerPrimaryActions = memo(function ComposerPrimaryActions({
  compact,
  pendingAction,
  isRunning,
  showPlanFollowUpPrompt,
  promptHasText,
  isSendBusy,
  isConnecting,
  isPreparingWorktree,
  hasSendableContent,
  onPreviousPendingQuestion,
  onInterrupt,
  onImplementPlanInNewThread,
}: ComposerPrimaryActionsProps) {
  if (pendingAction) {
    return (
      <div className={cn("flex items-center justify-end", compact ? "gap-1.5" : "gap-2")}>
        {pendingAction.questionIndex > 0 ? (
          compact ? (
            <Button
              size="icon-sm"
              variant="outline"
              className="rounded-full"
              onClick={onPreviousPendingQuestion}
              disabled={pendingAction.isResponding}
              aria-label="Previous question"
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={onPreviousPendingQuestion}
              disabled={pendingAction.isResponding}
            >
              Previous
            </Button>
          )
        ) : null}
        <Button
          type="submit"
          size="sm"
          className={cn("rounded-full", compact ? "px-3" : "px-4")}
          disabled={
            pendingAction.isResponding ||
            (pendingAction.isLastQuestion ? !pendingAction.isComplete : !pendingAction.canAdvance)
          }
        >
          {formatPendingPrimaryActionLabel({
            compact,
            isLastQuestion: pendingAction.isLastQuestion,
            isResponding: pendingAction.isResponding,
            questionIndex: pendingAction.questionIndex,
          })}
        </Button>
      </div>
    );
  }

  if (isRunning) {
    return (
      <button
        type="button"
        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-rose-500/90 text-white transition-all duration-150 hover:bg-rose-500 hover:scale-105 sm:h-8 sm:w-8"
        onClick={onInterrupt}
        aria-label="Stop generation"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
        </svg>
      </button>
    );
  }

  if (showPlanFollowUpPrompt) {
    if (promptHasText) {
      return (
        <Button
          type="submit"
          size="sm"
          className={cn("rounded-full", compact ? "h-9 px-3 sm:h-8" : "h-9 px-4 sm:h-8")}
          disabled={isSendBusy || isConnecting}
        >
          {isConnecting || isSendBusy ? "Sending..." : "Refine"}
        </Button>
      );
    }

    return (
      <div data-chat-composer-implement-actions="true" className="flex items-center justify-end">
        <Button
          type="submit"
          size="sm"
          className="h-9 rounded-l-full rounded-r-none px-4 sm:h-8"
          disabled={isSendBusy || isConnecting}
        >
          {isConnecting || isSendBusy ? "Sending..." : "Implement"}
        </Button>
        <Menu>
          <MenuTrigger
            render={
              <Button
                size="sm"
                variant="default"
                className="h-9 rounded-l-none rounded-r-full border-l-white/12 px-2 sm:h-8"
                aria-label="Implementation actions"
                disabled={isSendBusy || isConnecting}
              />
            }
          >
            <ChevronDownIcon className="size-3.5" />
          </MenuTrigger>
          <MenuPopup align="end" side="top">
            <MenuItem
              disabled={isSendBusy || isConnecting}
              onClick={() => void onImplementPlanInNewThread()}
            >
              Implement in a new thread
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    );
  }

  const disabled = isSendBusy || isConnecting || !hasSendableContent;
  return (
    <button
      type="submit"
      className="flex h-9 w-9 enabled:cursor-pointer items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-105 hover:bg-primary disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100 sm:h-8 sm:w-8"
      disabled={disabled}
      aria-label={
        isConnecting
          ? "Connecting"
          : isPreparingWorktree
            ? "Preparing worktree"
            : isSendBusy
              ? "Sending"
              : "Send message"
      }
    >
      {isConnecting || isSendBusy ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="animate-spin"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="20 12"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
});

export const NitroSubmitButton = memo(function NitroSubmitButton({
  disabled,
  disabledReason,
  onNitroSend,
}: NitroSubmitButtonProps) {
  const title = disabledReason ?? "Start Nitro episode";
  const staticIconClassName = cn(
    "size-8 transition-opacity",
    disabled ? "opacity-100" : "group-hover/nitro:opacity-0",
  );
  const animatedIconClassName = cn(
    "absolute size-8 opacity-0 transition-opacity",
    disabled ? "opacity-0" : "group-hover/nitro:opacity-100",
  );
  return (
    <button
      type="button"
      data-testid="nitro-submit-button"
      className="group/nitro relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-500/45 bg-background text-foreground shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:hover:scale-105 enabled:hover:border-orange-400 enabled:hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-30"
      disabled={disabled}
      aria-label="Start Nitro episode"
      title={title}
      onClick={onNitroSend}
    >
      <img
        src={nitroIconUrl}
        alt=""
        aria-hidden="true"
        className={staticIconClassName}
        draggable={false}
      />
      <img
        src={nitroAnimatedIconUrl}
        alt=""
        aria-hidden="true"
        className={animatedIconClassName}
        draggable={false}
      />
    </button>
  );
});

export const NitroMapContextButton = memo(function NitroMapContextButton({
  environmentId,
  projectId,
}: NitroMapContextButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={NITRO_MAP_ROUTE_BY_VIEW.map}
            params={buildNitroMapRouteParams({ environmentId, projectId })}
            data-testid="nitro-map-context-button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Open project map"
          >
            <MapIcon className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <TooltipPopup side="top">Project map</TooltipPopup>
    </Tooltip>
  );
});
