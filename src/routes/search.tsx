import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TypeBadge } from "@/components/needup/PostCard";
import { UserAvatar } from "@/components/needup/Avatar";
import { coverFor, type Community, type DbPostType } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Search — NeedUp" },
      { name: "description", content: "Search people, posts and communities on NeedUp." },
      { property: "og:title", content: "Search — NeedUp" },
      { property: "og:description", content: "Find people, posts and communities." },
    ],
  }),
  component: SearchPage,
});

const clean = (s: string) => s.replace(/[%_,()*\\]/g, " ").trim();

function SearchPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [tab, setTab] = useState("All");
  useEffect(() => { const t = setTimeout(() => setTerm(clean(q)), 300); return () => clearTimeout(t); }, [q]);

  const res = useQuery({
    queryKey: ["search", term],
    queryFn: async () => {
      const like = `%${term}%`;
      const [people, posts, comms] = await Promise.all([
        term ? supabase.from("profiles").select("id,full_name,username,avatar_url,location_name").or(`full_name.ilike.${like},username.ilike.${like}`).limit(8)
             : supabase.from("profiles").select("id,full_name,username,avatar_url,location_name").order("created_at", { ascending: false }).limit(6),
        supabase.from("posts").select("id,content,post_type,author:profiles!posts_user_id_fkey(full_name)").ilike("content", like).order("created_at", { ascending: false }).limit(8),
        supabase.from("communities").select("id,slug,name,description,location_name,cover_url").ilike("name", like).limit(8),
      ]);
      if (people.error || posts.error || comms.error) throw new Error("search");
      return {
        people: people.data ?? [],
        posts: (posts.data ?? []) as unknown as { id: string; content: string; post_type: DbPostType; author: { full_name: string } | null }[],
        communities: (comms.data ?? []) as Community[],
      };
    },
  });
  const show = (s: string) => tab === "All" || tab === s;
  const d = res.data;

  return (
    <div className="px-4 pt-5 md:px-0 md:pt-0">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-card px-4 py-3 shadow-card">
        <SearchIcon className="h-5 w-5 text-primary" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, posts, communities" className="min-w-0 flex-1 bg-transparent text-lg outline-none" />
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {["All", "People", "Posts", "Communities"].map((t) => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{t}</button>)}
      </div>
      {res.isLoading && <p className="mt-8 text-center text-muted-foreground">Searching…</p>}
      {res.isError && <p className="mt-8 text-center text-muted-foreground">Search isn't available right now. Please try again.</p>}
      {d && show("People") && d.people.length > 0 && (
        <section className="mt-6"><h2 className="mb-3 font-bold">People</h2>
          <div className="card-surface divide-y">{d.people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3.5"><UserAvatar src={p.avatar_url} name={p.full_name} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.full_name || "Member"}</p><p className="truncate text-sm text-muted-foreground">@{p.username}{p.location_name ? ` · ${p.location_name}` : ""}</p></div></div>
          ))}</div></section>
      )}
      {d && show("Posts") && d.posts.length > 0 && (
        <section className="mt-6"><h2 className="mb-3 font-bold">Posts</h2>
          <div className="space-y-3">{d.posts.map((p) => (
            <Link key={p.id} to="/post/$id" params={{ id: p.id }} className="card-surface block p-4 hover:border-primary"><div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{p.author?.full_name || "Member"}</span><TypeBadge type={p.post_type} /></div><p className="line-clamp-2">{p.content}</p></Link>
          ))}</div></section>
      )}
      {d && show("Communities") && d.communities.length > 0 && (
        <section className="mt-6"><h2 className="mb-3 font-bold">Communities</h2>
          <div className="grid grid-cols-2 gap-3">{d.communities.map((c) => (
            <Link key={c.id} to="/communities" className="card-surface overflow-hidden"><img src={coverFor(c)} alt="" loading="lazy" className="h-20 w-full object-cover" /><div className="p-3"><p className="truncate font-semibold">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.location_name}</p></div></Link>
          ))}</div></section>
      )}
      {d && !d.people.length && !d.posts.length && !d.communities.length && <p className="mt-10 text-center text-muted-foreground">No results for “{q}”.</p>}
    </div>
  );
}
