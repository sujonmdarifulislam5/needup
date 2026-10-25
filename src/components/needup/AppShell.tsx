import { useT, type TKey } from "@/lib/i18n";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Home, MapPin, Users, MessageCircle, User, Plus, Search, Bell, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { coverFor, fetchCommunities, fetchPosts, timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "./Avatar";
import { useLiveUpdates } from "@/lib/live";
import { Button } from "@/components/ui/button";

export function useMyCommunity() {
  const { profile } = useAuth();
  const q = useQuery({ queryKey: ["communities"], queryFn: fetchCommunities, staleTime: 5 * 60 * 1000 });
  const list = q.data ?? [];
  const mine = list.find((c) => c.id === profile?.community_id) ?? list.find((c) => c.slug === "saronkhola") ?? null;
  return { community: mine, communities: list, isLoading: q.isLoading };
}

const CreateCtx = createContext<() => void>(() => {});
export const useOpenCreate = () => useContext(CreateCtx);

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className={`grid place-items-center rounded-xl bg-brand font-extrabold text-primary-foreground ${size === "lg" ? "h-14 w-14 text-2xl" : "h-9 w-9 text-lg"}`}>N</span>
      <span className={`font-extrabold tracking-tight ${size === "lg" ? "text-3xl" : "text-xl"}`}>Need<span className="text-primary">Up</span></span>
    </Link>
  );
}

const nav = [
  { to: "/", label: "home", icon: Home },
  { to: "/nearby", label: "nearby", icon: MapPin },
  { to: "/communities", label: "communities", icon: Users },
  { to: "/messages", label: "messages", icon: MessageCircle },
  { to: "/profile", label: "profile", icon: User },
] as const;

export const createOptions = [
  { to: "/create/need", emoji: "🆘", title: "I Need", desc: "Tell people what you need", soft: "bg-need-soft" },
  { to: "/create/help", emoji: "🤝", title: "I Can Help", desc: "Tell people how you can help", soft: "bg-help-soft" },
  { to: "/create/work", emoji: "💼", title: "Work", desc: "Looking for work or a worker", soft: "bg-work-soft" },
  { to: "/create/post", emoji: "📝", title: "General Post", desc: "Share something with your community", soft: "bg-general-soft" },
] as const;

function CreateSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-8 rounded-t-3xl bg-card p-5 pb-8 shadow-lift sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">What do you want to share?</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {createOptions.map((o) => (
            <Link key={o.to} to={o.to} onClick={onClose} className="flex items-center gap-4 rounded-2xl border p-4 transition hover:border-primary hover:shadow-card sm:flex-col sm:items-start">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${o.soft}`}>{o.emoji}</span>
              <span className="min-w-0">
                <span className="block text-lg font-bold">{o.title}</span>
                <span className="block text-sm text-muted-foreground">{o.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function RightRail() {
  const { community } = useMyCommunity();
  const { user } = useAuth();
  const people = useQuery({
    queryKey: ["highlights", community?.id],
    enabled: !!community,
    queryFn: async () => {
      if (!community) return [];
      const { data, error } = await supabase.from("user_communities")
        .select("profile:profiles(id,full_name,avatar_url)")
        .eq("community_id", community.id).order("joined_at", { ascending: false }).limit(12);
      if (error) throw error;
      return (data ?? []).flatMap((row) => row.profile ? [row.profile] : []);
    },
  });
  const suggested = (people.data ?? []).filter((person) => person.id !== user?.id).slice(0, 4);
  const stats = useQuery({
    queryKey: ["community-stats", community?.id],
    enabled: !!community,
    queryFn: async () => {
      if (!community) return { members: 0, needs: 0, helpers: 0 };
      const id = community.id;
      const [m, n, h] = await Promise.all([
        supabase.from("user_communities").select("user_id", { count: "exact", head: true }).eq("community_id", id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("community_id", id).eq("post_type", "NEED"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("community_id", id).eq("post_type", "CAN_HELP"),
      ]);
      return { members: m.count ?? 0, needs: n.count ?? 0, helpers: h.count ?? 0 };
    },
  });
  const needs = useQuery({ queryKey: ["posts", "rail-needs"], queryFn: () => fetchPosts({ type: "NEED", limit: 4 }) });
  return (
    <aside aria-label="Community information" className="sticky top-6 hidden h-fit w-[280px] min-w-0 shrink-0 space-y-5 xl:block">
      <div className="card-surface overflow-hidden">
        {community && <img src={coverFor(community)} alt="" className="h-24 w-full object-cover" />}
        <div className="p-5">
          <p className="text-sm text-muted-foreground">Your community</p>
          <p className="break-words text-lg font-bold">📍 {community?.name ?? "…"}</p>
          {community?.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{community.description}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[[stats.data?.members, "Members"], [stats.data?.needs, "Needs"], [stats.data?.helpers, "Helpers"]].map(([n, l]) => (
              <div key={l as string} className="rounded-xl bg-muted py-2"><p className="font-bold">{n ?? "–"}</p><p className="text-xs text-muted-foreground">{l}</p></div>
            ))}
          </div>
          <Link to="/communities" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Users className="h-4 w-4 shrink-0" />View communities</Link>
        </div>
      </div>
      <div className="card-surface p-5">
        <h2 className="mb-4 font-bold">Suggested people</h2>
        <div className="space-y-4">
          {suggested.map((person) => (
            <div key={person.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <UserAvatar src={person.avatar_url} name={person.full_name} className="h-10 w-10" />
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{person.full_name || "Community member"}</p><p className="truncate text-xs text-muted-foreground">{community?.name}</p></div>
            </div>
          ))}
          {!suggested.length && <p className="text-sm text-muted-foreground">No other community members yet.</p>}
        </div>
      </div>
      <div className="card-surface p-5">
        <h2 className="mb-3 font-bold">Community highlights</h2>
        <p className="mb-3 text-xs font-semibold text-muted-foreground">Recent needs</p>
        <div className="space-y-3">
          {(needs.data ?? []).map((p) => (
            <Link key={p.id} to="/post/$id" params={{ id: p.id }} className="flex gap-3 rounded-xl p-1 hover:bg-muted">
              <UserAvatar src={p.author?.avatar_url} name={p.author?.full_name} className="h-9 w-9" />
              <div className="min-w-0"><p className="line-clamp-2 text-sm">{p.content}</p><p className="text-xs text-muted-foreground">{p.location_name ?? p.community?.name} · {timeAgo(p.created_at)}</p></div>
            </Link>
          ))}
          {needs.data && !needs.data.length && <p className="text-sm text-muted-foreground">No needs yet — your community is doing great.</p>}
        </div>
      </div>
      <p className="px-2 text-xs text-muted-foreground">NeedUp · People helping people. © 2026</p>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t } = useT();
  useLiveUpdates(user?.id);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  useEffect(() => {
    if (profile && !profile.onboarded && path !== "/onboarding") navigate({ to: "/onboarding" });
  }, [profile, path, navigate]);
  const unread = useQuery({
    queryKey: ["notif-unread", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const openCreate = () => (user ? setOpen(true) : navigate({ to: "/auth" }));

  return (
    <CreateCtx.Provider value={openCreate}>
      {/* mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <Link to="/search" className="rounded-full p-2.5 hover:bg-muted" aria-label="Search"><Search className="h-5 w-5" /></Link>
          <Link to="/notifications" className="relative rounded-full p-2.5 hover:bg-muted" aria-label="Notifications"><Bell className="h-5 w-5" />{!!unread.data && <span className="absolute right-2 top-2 min-w-3 rounded-full bg-need px-1 text-center text-[9px] font-bold text-primary-foreground">{unread.data}</span>}</Link>
          {user ? <Link to="/profile" className="ml-1"><UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-8 w-8" /></Link>
            : <Link to="/auth" className="ml-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Sign in</Link>}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1320px] gap-6 md:px-4 lg:px-6 xl:max-w-[1296px]">
        {/* sidebar */}
        <aside aria-label="Navigation" className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col py-6 md:flex lg:w-64 xl:w-[240px] xl:py-0">
          <div className="flex h-full min-h-0 flex-col xl:fixed xl:inset-y-0 xl:w-[240px] xl:overflow-y-auto xl:py-6 xl:pr-4">
          <div className="px-3 lg:px-2"><span className="lg:hidden"><Link to="/" className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-lg font-extrabold text-primary-foreground">N</Link></span><span className="hidden lg:block"><Logo /></span></div>
          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[17px] font-medium transition ${active(n.to) ? "bg-primary-soft font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <n.icon className="h-6 w-6 shrink-0" /><span className="hidden lg:inline">{t(n.label)}</span>
              </Link>
            ))}
            <Link to="/notifications" className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[17px] font-medium ${active("/notifications") ? "bg-primary-soft text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <span className="relative"><Bell className="h-6 w-6 shrink-0" />{!!unread.data && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-need px-1 text-center text-[10px] font-bold text-primary-foreground">{unread.data}</span>}</span><span className="hidden lg:inline">{t("notifications")}</span>
            </Link>
          </nav>
          <button onClick={openCreate} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 font-semibold text-primary-foreground shadow-lift transition hover:opacity-95 xl:hidden">
            <Plus className="h-5 w-5" /><span className="hidden lg:inline">{t("createPost")}</span>
          </button>
          <Button onClick={openCreate} className="mt-6 hidden h-12 w-full rounded-2xl bg-brand text-base font-semibold shadow-lift hover:opacity-95 xl:inline-flex"><Plus className="h-5 w-5" />Create Post</Button>
          {user ? (
            <Link to="/profile" className="mt-auto flex items-center gap-3 rounded-2xl p-2 hover:bg-muted">
              <UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-10 w-10" />
              <div className="hidden min-w-0 lg:block"><p className="truncate font-semibold">{profile?.full_name || "Your profile"}</p><p className="truncate text-sm text-muted-foreground">@{profile?.username}</p></div>
            </Link>
          ) : (
            <Link to="/auth" className="mt-auto flex items-center justify-center rounded-2xl border px-4 py-3 font-semibold hover:border-primary"><User className="h-5 w-5 lg:hidden" /><span className="hidden lg:inline">Sign in</span></Link>
          )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-28 md:py-6 md:pb-10">
          <div className="mx-auto w-full max-w-2xl xl:max-w-[680px]">{children}</div>
        </main>
        <RightRail />
      </div>

      {/* bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[nav[0], nav[1]].map((n) => <BottomItem key={n.to} {...n} active={active(n.to)} />)}
        <button onClick={openCreate} className="mx-auto -mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand text-primary-foreground shadow-lift" aria-label="Create"><Plus className="h-7 w-7" /></button>
        {[nav[3], nav[4]].map((n) => <BottomItem key={n.to} {...n} active={active(n.to)} />)}
      </nav>
      {open && <CreateSheet onClose={() => setOpen(false)} />}
    </CreateCtx.Provider>
  );
}

function BottomItem({ to, label, icon: Icon, active }: { to: string; label: TKey; icon: typeof Home; active: boolean }) {
  const { t } = useT();
  return (
    <Link to={to} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className="h-6 w-6" />{t(label)}
    </Link>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-5 md:px-0 md:pt-0">
      <div className="min-w-0"><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-muted-foreground">{sub}</p>}</div>
      {right}
    </div>
  );
}
