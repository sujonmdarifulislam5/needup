import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, primaryBtn } from "@/components/needup/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set a new password — NeedUp" },
      { name: "description", content: "Choose a new password for your NeedUp account." },
      { property: "og:title", content: "Set a new password — NeedUp" },
      { property: "og:description", content: "Choose a new password for your NeedUp account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session && isRecovery) setReady(true); else if (data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== pw2) return setError("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError("We couldn't update your password. The link may have expired.");
    toast.success("Password updated");
    nav({ to: "/" });
  };

  return (
    <AuthLayout title="Set a new password">
      {!ready ? (
        <p className="text-center text-muted-foreground">Open this page from the reset link in your email.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />
          <Field label="Confirm password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" />
          {error && <p className="rounded-xl bg-need-soft px-4 py-3 text-sm font-medium text-need">{error}</p>}
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Update password"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
