import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Feed } from "@/components/needup/Feed";
import { UserAvatar } from "@/components/needup/Avatar";
import { useMyCommunity, useOpenCreate } from "@/components/needup/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchMyCommunityIds } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Home — NeedUp" },
      { name: "description", content: "Your community feed: needs, offers, work and local news on NeedUp." },
      { property: "og:title", content: "Home — NeedUp" },
      { property: "og:description", content: "See what your neighbors need and how they can help." },
    ],
  }),
  component: Home,
});

const tabs = ["For You", "Nearby", "Following"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Home() {
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
  const openCreate = useOpenCreate();
  const { user, profile } = useAuth();
  const { community } = useMyCommunity();
  const [tab, setTab] = useState(0);
  const joined = useQuery({ queryKey: ["my-communities", user?.id], enabled: !!user, queryFn: () => user ? fetchMyCommunityIds(user.id) : Promise.resolve([]) });
  const members = useQuery({
    queryKey: ["highlights", community?.id],
    enabled: !!community,
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase.from("user_communities").select("profile:profiles(id,full_name,avatar_url)").eq("community_id", community.id).order("joined_at", { ascending: false }).limit(12);
      return (data ?? []).map((r) => r.profile).filter(Boolean) as { id: string; full_name: string; avatar_url: string | null }[];
    },
  });
  const first = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-5">
      <div className="hidden items-center gap-3 md:flex">
        <Link to="/search" className="flex flex-1 items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-muted-foreground shadow-card">
          <Search className="h-5 w-5" /> Search people, posts, communities
        </Link>
      </div>

      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-foreground"><MapPin className="h-4 w-4" /> {community?.name ?? "Your community"}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{hello}{first ? `, ${first}` : ""} 👋</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 md:px-0">
        <Link to="/create/need" className="rounded-3xl bg-need-soft p-5 transition hover:shadow-card">
          <span className="text-3xl">🆘</span>
          <p className="mt-2 text-xl font-extrabold text-need">I Need</p>
          <p className="text-sm text-muted-foreground">Ask your neighbors</p>
        </Link>
        <Link to="/create/help" className="rounded-3xl bg-help-soft p-5 transition hover:shadow-card">
          <span className="text-3xl">🤝</span>
          <p className="mt-2 text-xl font-extrabold text-help">I Can Help</p>
          <p className="text-sm text-muted-foreground">Offer your skills</p>
        </Link>
      </div>

      {!!members.data?.length && (
        <section>
          <h2 className="mb-3 px-4 font-bold md:px-0">Community Highlights</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 md:px-0">
            {members.data.map((h) => (
              <div key={h.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <span className="rounded-full bg-brand p-[2.5px]"><span className="block rounded-full border-2 border-card"><UserAvatar src={h.avatar_url} name={h.full_name} className="h-16 w-16" /></span></span>
                <span className="w-full truncate text-center text-xs font-medium">{h.full_name.split(" ")[0] || "Member"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card-surface mx-4 p-4 md:mx-0">
        <button onClick={openCreate} className="flex w-full items-center gap-3 text-left">
          <UserAvatar src={profile?.avatar_url} name={profile?.full_name} />
          <span className="flex-1 rounded-2xl bg-muted px-4 py-3 text-muted-foreground">What do you need or want to share?</span>
        </button>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {([["🆘", "Need", "/create/need"], ["🤝", "Can Help", "/create/help"], ["💼", "Work", "/create/work"], ["📝", "Post", "/create/post"]] as const).map(([e, l, to]) => (
            <Link key={l} to={to} className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold hover:bg-muted sm:flex-row sm:justify-center sm:text-sm">
              <span className="text-lg">{e}</span>{l}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-4 flex gap-1 rounded-2xl bg-muted p-1 md:mx-0">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${tab === i ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      <div className="px-4 md:px-0">
        {tab === 0 && <Feed queryKey={["all"]} />}
        {tab === 1 && (community ? <Feed queryKey={["community", community.id]} communityIds={[community.id]} emptyText="No posts in your community yet." /> : null)}
        {tab === 2 && (user
          ? joined.data ? <Feed queryKey={["following", ...joined.data]} communityIds={joined.data} emptyText="Join communities to see their posts here." /> : null
          : <div className="card-surface p-8 text-center"><p className="text-muted-foreground">Sign in to see posts from communities you follow.</p><Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign in</Link></div>)}
      </div>
    </div>
  );
}
