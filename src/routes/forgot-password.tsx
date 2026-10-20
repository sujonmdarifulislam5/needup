import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, primaryBtn } from "@/components/needup/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Forgot password — NeedUp" },
      { name: "description", content: "Reset your NeedUp password." },
      { property: "og:title", content: "Forgot password — NeedUp" },
      { property: "og:description", content: "Reset your NeedUp password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) setError("We couldn't send the email. Please try again in a minute.");
    else setDone(true);
  };
  return (
    <AuthLayout title="Forgot password?" sub="We'll email you a reset link.">
      {done ? (
        <p className="text-center text-muted-foreground">If an account exists for <b className="text-foreground">{email}</b>, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="rounded-xl bg-need-soft px-4 py-3 text-sm font-medium text-need">{error}</p>}
          <button disabled={busy} className={primaryBtn}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <Link to="/auth" className="mt-6 block text-center text-sm font-semibold text-primary">Back to sign in</Link>
    </AuthLayout>
  );
}
