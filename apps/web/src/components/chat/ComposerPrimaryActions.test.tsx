import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ComposerPrimaryActions, NitroSubmitButton } from "./ComposerPrimaryActions";

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
});
