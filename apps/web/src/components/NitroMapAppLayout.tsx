import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, MapIcon } from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { Button } from "./ui/button";
import { Sidebar, SidebarContent, SidebarProvider, SidebarRail } from "./ui/sidebar";
import {
  clearShortcutModifierState,
  syncShortcutModifierStateFromKeyboardEvent,
} from "../shortcutModifierState";

export function NitroMapAppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      syncShortcutModifierStateFromKeyboardEvent(event);
    };
    const onWindowKeyUp = (event: KeyboardEvent) => {
      syncShortcutModifierStateFromKeyboardEvent(event);
    };
    const onWindowBlur = () => {
      clearShortcutModifierState();
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    window.addEventListener("keyup", onWindowKeyUp, true);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
      window.removeEventListener("keyup", onWindowKeyUp, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "open-settings") {
        void navigate({ to: "/settings" });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        side="left"
        collapsible="offcanvas"
        className="border-r border-border bg-card text-foreground"
        style={{ "--sidebar-width": "13rem" } as CSSProperties}
      >
        <SidebarContent className="gap-0 p-2">
          <div className="flex min-h-12 items-center gap-2 px-2">
            <MapIcon className="size-4 text-muted-foreground" />
            <span className="truncate text-sm font-semibold text-foreground">NitroMap</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 w-full justify-start"
            render={<Link to="/" />}
          >
            <ArrowLeftIcon />
            Chats
          </Button>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      {children}
    </SidebarProvider>
  );
}
