import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, useMyCommunity } from "@/components/needup/AppShell";
import { ErrorBox, Loading } from "@/components/needup/Avatar";
import { coverFor, fetchMyCommunityIds } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Communities — NeedUp" },
      { name: "description", content: "Your local community and new communities to join on NeedUp." },
      { property: "og:title", content: "Communities — NeedUp" },
      { property: "og:description", content: "Find and join communities near you." },
    ],
  }),
  component: Communities,
});

function Communities() {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { community: mine, communities, isLoading } = useMyCommunity();
  const joined = useQuery({ queryKey: ["my-communities", user?.id], enabled: !!user, queryFn: () => fetchMyCommunityIds(user!.id) });
  const counts = useQuery({
    queryKey: ["community-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_communities").select("community_id");
      if (error) throw error;
      const m: Record<string, number> = {};
      (data ?? []).forEach((r) => { m[r.community_id] = (m[r.community_id] ?? 0) + 1; });
      return m;
    },
  });
  const stats = useQuery({
    queryKey: ["community-detail", mine?.id],
    enabled: !!mine,
    queryFn: async () => {
      const id = mine!.id;
      const c = (t?: "NEED" | "CAN_HELP") => {
        let q = supabase.from("posts").select("id", { count: "exact", head: true }).eq("community_id", id);
        if (t) q = q.eq("post_type", t);
        return q;
      };
      const [all, need, help] = await Promise.all([c(), c("NEED"), c("CAN_HELP")]);
      return { posts: all.count ?? 0, needs: need.count ?? 0, help: help.count ?? 0 };
    },
  });

  const toggle = async (id: string, isJoined: boolean) => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { error } = isJoined
      ? await supabase.from("user_communities").delete().eq("user_id", user.id).eq("community_id", id)
      : await supabase.from("user_communities").insert({ user_id: user.id, community_id: id });
    if (error) { toast.error("Couldn't update membership."); return; }
    toast.success(isJoined ? "You left the community" : "Joined!");
    qc.invalidateQueries({ queryKey: ["my-communities"] });
    qc.invalidateQueries({ queryKey: ["community-counts"] });
  };

  const makeHome = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ community_id: id }).eq("id", user.id);
    if (error) { toast.error("Couldn't change your community."); return; }
    await refreshProfile();
    qc.invalidateQueries();
    toast.success("Your community was updated");
  };

  if (isLoading) return <div className="px-4 pt-5 md:px-0 md:pt-0"><Loading /></div>;
  if (!communities.length) return <div className="px-4 pt-5 md:px-0"><ErrorBox /></div>;

  return (
    <div className="px-4 md:px-0">
      <PageHeader title="Communities" sub="Where neighbors help each other" />
      {mine && (
        <>
          <h2 className="mb-3 font-bold">My Community</h2>
          <div className="card-surface overflow-hidden">
            <img src={coverFor(mine)} alt="" className="h-36 w-full object-cover sm:h-44" />
            <div className="p-5">
              <p className="text-xl font-extrabold">📍 {mine.name}</p>
              {mine.description && <p className="mt-1 text-muted-foreground">{mine.description}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[[counts.data?.[mine.id] ?? 0, "Members", "bg-primary-soft"], [stats.data?.posts, "Recent posts", "bg-general-soft"], [stats.data?.needs, "Needs", "bg-need-soft"], [stats.data?.help, "Can Help", "bg-help-soft"]].map(([n, l, c]) => (
                  <div key={l as string} className={`rounded-2xl p-3 ${c}`}><p className="text-2xl font-extrabold">{n ?? "–"}</p><p className="text-sm text-muted-foreground">{l}</p></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      <h2 className="mb-3 mt-8 font-bold">Discover Communities</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {communities.map((c) => {
          const j = !!joined.data?.includes(c.id);
          const home = profile?.community_id === c.id;
          return (
            <div key={c.id} className="card-surface overflow-hidden">
              <img src={coverFor(c)} alt="" loading="lazy" className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate font-bold">{c.name}</p><p className="text-sm text-muted-foreground">{counts.data?.[c.id] ?? 0} members</p></div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button onClick={() => toggle(c.id, j)} disabled={home} className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${j ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>{home ? "Home" : j ? "Leave" : "Join"}</button>
                  {j && !home && <button onClick={() => makeHome(c.id)} className="text-xs font-semibold text-primary">Make my community</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
