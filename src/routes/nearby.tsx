import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, useMyCommunity } from "@/components/needup/AppShell";
import { Feed } from "@/components/needup/Feed";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/components/needup/Avatar";
import type { DbPostType } from "@/lib/api";

export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Nearby — NeedUp" },
      { name: "description", content: "People and posts around you, with approximate locations only." },
      { property: "og:title", content: "Nearby — NeedUp" },
      { property: "og:description", content: "Discover needs and helpers close to you." },
    ],
  }),
  component: Nearby,
});

const filters: { label: string; v: DbPostType | "all" }[] = [
  { label: "All", v: "all" }, { label: "🆘 Need", v: "NEED" }, { label: "🤝 Can Help", v: "CAN_HELP" }, { label: "💼 Work", v: "WORK" }, { label: "📝 Posts", v: "GENERAL" },
];

function Nearby() {
  const [f, setF] = useState<DbPostType | "all">("all");
  const { profile } = useAuth();
  const { communities, isLoading } = useMyCommunity();
  const [selected, setSelected] = useState("");
  const community = communities.find((c) => c.id === (selected || profile?.community_id));
  return (
    <div>
      <PageHeader title="Nearby" sub={`People and posts around you${community ? ` · ${community.name}` : ""}`} />
      <div className="mb-4 px-4 md:px-0">
        <label htmlFor="nearby-community" className="mb-2 block text-sm font-semibold">Community</label>
        <select id="nearby-community" value={community?.id ?? ""} onChange={(e) => setSelected(e.target.value)} className="w-full rounded-xl border bg-card px-3 py-2 text-foreground">
          <option value="">Select a community</option>
          {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto px-4 md:px-0">
        {filters.map((x) => (
          <Button variant="outline" key={x.v} onClick={() => setF(x.v)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${f === x.v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>{x.label}</Button>
        ))}
      </div>
      <p className="mb-3 px-4 text-xs text-muted-foreground md:px-0">🔒 Only approximate areas are shown — never home addresses.</p>
      <div className="px-4 md:px-0">
        {community
          ? <Feed queryKey={["nearby", community.id, f]} communityIds={[community.id]} type={f === "all" ? undefined : f} emptyTitle="Nothing nearby yet" emptyText="Posts from your community will appear here." />
          : isLoading ? <Loading /> : null}
      </div>
    </div>
  );
}
