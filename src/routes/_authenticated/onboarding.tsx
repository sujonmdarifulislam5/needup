import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/needup/AuthLayout";
import { ProfileForm } from "@/components/needup/ProfileForm";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set up your profile — NeedUp" },
      { name: "description", content: "Add your photo, bio and community." },
      { property: "og:title", content: "Set up your profile — NeedUp" },
      { property: "og:description", content: "Add your photo, bio and community." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const { profile } = useAuth();
  return (
    <AuthLayout title="Set up your profile" sub="Let your neighbors know who you are.">
      {profile ? <ProfileForm key={profile.id} submitLabel="Start using NeedUp" withCommunity onDone={() => nav({ to: "/" })} /> : <p className="text-center text-muted-foreground">Loading…</p>}
    </AuthLayout>
  );
}
