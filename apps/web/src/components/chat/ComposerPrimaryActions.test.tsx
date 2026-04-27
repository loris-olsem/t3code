import { renderToStaticMarkup } from "react-dom/server";
import { EnvironmentId, ProjectId } from "@nitrocode/contracts";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: React.ReactNode;
    params: Record<string, string>;
    to: string;
  }) => (
    <a
      href={to
        .replace("$environmentId", params.environmentId)
        .replace("$projectId", params.projectId)}
      {...props}
    >
      {children}
    </a>
  ),
}));

import {
  ComposerPrimaryActions,
  NitroMapContextButton,
  NitroSubmitButton,
} from "./ComposerPrimaryActions";

const baseProps = {
  compact: false,
  pendingAction: null,
  isRunning: false,
  showPlanFollowUpPrompt: false,
  promptHasText: true,
  isSendBusy: false,
  isConnecting: false,
  isPreparingWorktree: false,
  hasSendableContent: true,
  onPreviousPendingQuestion: vi.fn(),
  onInterrupt: vi.fn(),
  onNitroSend: vi.fn(),
  onImplementPlanInNewThread: vi.fn(),
};

describe("ComposerPrimaryActions", () => {
  it("keeps Nitro as an explicit non-form submit action beside regular send", () => {
    const markup = renderToStaticMarkup(
      <>
        <NitroSubmitButton disabled={false} onNitroSend={baseProps.onNitroSend} />
        <ComposerPrimaryActions {...baseProps} />
      </>,
    );

    expect(markup).toContain('aria-label="Start Nitro episode"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain("h-12");
    expect(markup).toContain("w-12");
    expect(markup.match(/<img /g)).toHaveLength(2);
    expect(markup).toContain("group/nitro");
    expect(markup).toContain("group-hover/nitro:opacity-0");
    expect(markup).toContain("group-hover/nitro:opacity-100");
    expect(markup).toContain('aria-label="Send message"');
    expect(markup).toContain('type="submit"');
  });

  it("uses the project-map icon as a real map link", () => {
    const markup = renderToStaticMarkup(
      <NitroMapContextButton
        environmentId={EnvironmentId.make("environment-1")}
        projectId={ProjectId.make("project-1")}
      />,
    );

    expect(markup).toContain('aria-label="Open project map"');
    expect(markup).toContain("lucide-map");
    expect(markup).toContain("/projects/environment-1/project-1/map");
  });

  it("explains disabled Nitro when Cartographer has not produced a map", () => {
    const markup = renderToStaticMarkup(
      <NitroSubmitButton
        disabled
        disabledReason="Run the Cartographer before starting a Nitro episode."
        onNitroSend={baseProps.onNitroSend}
      />,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("Run the Cartographer before starting a Nitro episode.");
    expect(markup).not.toContain("group-hover/nitro");
  });
});
