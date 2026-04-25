import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

function NitroMapRouteLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_nitromap")({
  beforeLoad: async ({ context }) => {
    if (context.authGateState.status !== "authenticated") {
      throw redirect({ to: "/pair", replace: true });
    }
  },
  component: NitroMapRouteLayout,
});
