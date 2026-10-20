import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, UserRound } from "lucide-react";
import { Logo } from "@/components/needup/AppShell";
import { googleSignIn } from "@/lib/google";
import village from "@/assets/village.jpg";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Welcome to NeedUp — People helping people" },
      { name: "description", content: "Join NeedUp to share what you need and help people near you." },
      { property: "og:title", content: "Welcome to NeedUp" },
      { property: "og:description", content: "People helping people." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={village} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand opacity-60" />
        <div className="absolute bottom-12 left-12 right-12 text-primary-foreground">
          <p className="text-4xl font-extrabold leading-tight">Ask. Offer. Connect.<br />Right in your neighborhood.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Welcome to NeedUp</h1>
          <p className="mt-2 text-lg text-muted-foreground">People helping people.</p>
          <div className="mt-8 space-y-3">
            <button onClick={googleSignIn} className="flex w-full items-center justify-center gap-3 rounded-2xl border bg-card py-4 font-semibold shadow-card hover:border-primary">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-sm font-extrabold text-need">G</span> Continue with Google
            </button>
            <Link to="/auth" search={{ mode: "signup" }} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand py-4 font-semibold text-primary-foreground shadow-lift"><Mail className="h-5 w-5" /> Continue with Email</Link>
            <Link to="/" className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-semibold text-accent-foreground hover:bg-primary-soft"><UserRound className="h-5 w-5" /> Continue as Guest</Link>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">By continuing you agree to our Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
