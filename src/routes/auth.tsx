import { createFileRoute, redirect } from "@tanstack/react-router";

// The admin login lives at "/" — keep the auth gate's destination working.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
