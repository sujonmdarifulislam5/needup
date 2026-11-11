import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { restoreNativeSession } from "@/lib/native";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Use the saved session so reopening the phone app keeps you signed in (even on slow internet).
    await restoreNativeSession().catch(() => {});
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: () => <Outlet />,
});
