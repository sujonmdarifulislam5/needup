import { languages, useT } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, MapPin, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyCommunity } from "@/components/needup/AppShell";
import { Feed } from "@/components/needup/Feed";
import { UserAvatar } from "@/components/needup/Avatar";
import { ProfileForm } from "@/components/needup/ProfileForm";
import { coverFor, type DbPostType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My profile — NeedUp" },
      { name: "description", content: "Your NeedUp profile, skills and posts." },
      { property: "og:title", content: "My profile — NeedUp" },
      { property: "og:description", content: "Your NeedUp profile, skills and posts." },
    ],
  }),
  component: Profile,
});

const tabs: { label: string; v: DbPostType | "all" }[] = [{ label: "Posts", v: "all" }, { label: "Needs", v: "NEED" }, { label: "Can Help", v: "CAN_HELP" }, { label: "Work", v: "WORK" }];

function Profile() {
  const { user, profile, signOut } = useAuth();
  const { community } = useMyCommunity();
  const nav = useNavigate();
  const [t, setT] = useState<DbPostType | "all">("all");
  const [edit, setEdit] = useState(false);
  const { t: tr, lang, setLang } = useT();
  const stats = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [p, h, c] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("need_responses").select("id", { count: "exact", head: true }).eq("responder_id", user!.id),
        supabase.from("user_communities").select("community_id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { posts: p.count ?? 0, helped: h.count ?? 0, comms: c.count ?? 0 };
    },
  });
  const skills = useQuery({
    queryKey: ["posts", "skills", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("title").eq("user_id", user!.id).eq("post_type", "CAN_HELP").not("title", "is", null);
      return [...new Set((data ?? []).map((r) => r.title as string))];
    },
  });

  if (!profile || !user) return <p className="p-10 text-center text-muted-foreground">Loading profile…</p>;

  return (
    <div>
      <div className="card-surface overflow-hidden rounded-none border-x-0 md:rounded-[1.25rem] md:border-x">
        {community && <img src={coverFor(community)} alt="" className="h-32 w-full object-cover sm:h-44" />}
        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <span className="rounded-full border-4 border-card"><UserAvatar src={profile.avatar_url} name={profile.full_name} className="h-24 w-24 text-2xl" /></span>
            <div className="flex gap-2">
              <button onClick={() => setEdit(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Pencil className="h-4 w-4" /> {tr("editProfile")}</button>
              <button onClick={async () => { await signOut(); nav({ to: "/welcome", replace: true }); }} className="rounded-xl border p-2" aria-label="Sign out" title="Sign out"><LogOut className="h-5 w-5" /></button>
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold">{profile.full_name || "Your name"}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {community?.name ?? "No community yet"}</p>
          <p className="mt-3 leading-relaxed">{profile.bio || <span className="text-muted-foreground">Add a short bio so neighbors know how you can help.</span>}</p>
          {!!skills.data?.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.data.map((s) => <span key={s} className="rounded-full bg-help-soft px-3 py-1 text-sm font-semibold text-help">🤝 {s}</span>)}
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[[stats.data?.posts, "Posts"], [stats.data?.helped, "Help offers"], [stats.data?.comms, "Communities"]].map(([n, l]) => (
              <div key={l as string} className="rounded-2xl bg-muted py-3"><p className="text-xl font-extrabold">{n ?? "–"}</p><p className="text-xs text-muted-foreground">{l}</p></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card-surface mx-4 mt-5 flex items-center justify-between gap-3 p-4 md:mx-0">
        <span className="font-semibold">🌐 {tr("language")}</span>
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {languages.map((l) => <button key={l.code} onClick={() => setLang(l.code)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${lang === l.code ? "bg-card shadow-card" : "text-muted-foreground"}`}>{l.label}</button>)}
        </div>
      </div>
      <div className="mx-4 mt-5 flex gap-1 rounded-2xl bg-muted p-1 md:mx-0">
        {tabs.map((x) => <button key={x.v} onClick={() => setT(x.v)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${t === x.v ? "bg-card shadow-card" : "text-muted-foreground"}`}>{x.label}</button>)}
      </div>
      <div className="mt-4 px-4 md:px-0">
        <Feed queryKey={["mine", user.id, t]} userId={user.id} type={t === "all" ? undefined : t} emptyText="Your posts will appear here." />
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center" onClick={() => setEdit(false)}>
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lift sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Edit profile</h2><button onClick={() => setEdit(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Close"><X className="h-5 w-5" /></button></div>
            <ProfileForm submitLabel="Save changes" onDone={() => setEdit(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
