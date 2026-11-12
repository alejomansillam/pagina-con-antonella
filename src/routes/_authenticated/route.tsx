import { createFileRoute, Outlet, redirect, useHydrated } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/portal-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const hydrated = useHydrated();

  // `ssr: false` emits an empty boundary on the server. Keep the first client
  // render identical, then mount the authenticated shell after hydration.
  if (!hydrated) return null;

  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}
