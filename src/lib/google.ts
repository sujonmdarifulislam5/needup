import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

// Lovable's own backend uses the managed Google login; your own backend uses its Google provider directly.
const LOVABLE_REF = "jgkosnkfydxdaehoqgwt";

export async function googleSignIn() {
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";
  if (url.includes(LOVABLE_REF)) {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed. Please try again.");
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
  });
  if (error) toast.error("Google sign-in isn't set up yet. Please use email for now.");
}
