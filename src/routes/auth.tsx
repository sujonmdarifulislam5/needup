import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { googleSignIn } from "@/lib/google";
import { AuthLayout, Field, primaryBtn } from "@/components/needup/AuthLayout";
import { useAuth } from "@/lib/auth";

type Search = { redirect?: string | undefined; mode?: "signup" | "login" | undefined };
const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — NeedUp" },
      { name: "description", content: "Sign in or create your NeedUp account." },
      { property: "og:title", content: "Sign in — NeedUp" },
      { property: "og:description", content: "Join your community on NeedUp." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (user) nav({ to: safe(search.redirect) }); }, [user, nav, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setBusy(true);
    if (mode === "signup") {
      if (name.trim().length < 2) { setError("Please enter your full name."); setBusy(false); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters."); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
      });
      setBusy(false);
      if (error) { setError(/registered|exists/i.test(error.message) ? "An account with this email already exists. Try signing in." : "We couldn't create your account. Please check your details."); return; }
      if (!data.session) setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setError(/confirm/i.test(error.message) ? "Please confirm your email first — check your inbox." : "Wrong email or password.");
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" sub="We sent you a confirmation link.">
        <p className="text-center text-muted-foreground">Open the link sent to <b className="text-foreground">{email}</b> to activate your account. After that you'll set up your profile and photo.</p>
        <button onClick={() => { setSent(false); setMode("login"); }} className={`${primaryBtn} mt-6`}>Back to sign in</button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={mode === "login" ? "Welcome back" : "Join NeedUp"} sub="People helping people.">
      <div className="mb-6 flex gap-1 rounded-2xl bg-muted p-1">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(null); }} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${mode === m ? "bg-card shadow-card" : "text-muted-foreground"}`}>{m === "login" ? "Sign in" : "Create account"}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" method="post" action="/auth" autoComplete="on">
        {mode === "signup" && <Field label="Full name" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />}
        <Field label="Email" name="email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username email" />
        <Field label="Password" name="password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        {mode === "signup" && <p className="text-sm text-muted-foreground">You can add a profile photo right after you sign up.</p>}
        {error && <p className="rounded-xl bg-need-soft px-4 py-3 text-sm font-medium text-need">{error}</p>}
        <button disabled={busy} className={primaryBtn}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      {mode === "login" && <Link to="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-primary">Forgot password?</Link>}
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <button onClick={googleSignIn} className="flex w-full items-center justify-center gap-3 rounded-2xl border bg-card py-4 font-semibold shadow-card hover:border-primary">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-sm font-extrabold text-need">G</span> Continue with Google
      </button>
      <Link to="/" className="mt-4 block text-center text-sm font-semibold text-muted-foreground">Continue as guest</Link>
    </AuthLayout>
  );
}
