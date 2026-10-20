import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";

export async function googleSignIn() {
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) toast.error("Google sign-in failed. Please try again.");
}
