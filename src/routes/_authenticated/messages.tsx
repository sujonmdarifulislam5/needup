import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchConversations } from "@/lib/messages";
import { timeAgo } from "@/lib/api";
import { Empty, ErrorBox, Loading, UserAvatar } from "@/components/needup/Avatar";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Messages — NeedUp" },
      { name: "description", content: "Chat with neighbors who need or offer help." },
      { property: "og:title", content: "Messages — NeedUp" },
      { property: "og:description", content: "Your NeedUp conversations." },
    ],
  }),
  component: () => <Outlet />,
});

export function ConversationList() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [filter, setFilter] = useState("");
  const q = useQuery({ queryKey: ["conversations", user?.id], enabled: !!user, refetchInterval: 30000, queryFn: () => user ? fetchConversations(user.id) : Promise.resolve([]) });
  const list = (q.data ?? []).filter((c) => !filter || c.other?.full_name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <div className="px-4 pb-3 pt-5 md:px-0 md:pt-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Messages</h1>
        <div className="mt-3 flex items-center gap-2 rounded-2xl border bg-card px-4 py-2.5"><Search className="h-4 w-4 text-muted-foreground" /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search messages" className="min-w-0 flex-1 bg-transparent outline-none" /></div>
      </div>
      <div className="mx-4 md:mx-0">
        {q.isLoading ? <Loading /> : q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : !list.length ? (
          <Empty title="No conversations yet" text="Tap “Message” or “I Can Help” on a post to start chatting." />
        ) : (
          <div className="card-surface divide-y overflow-hidden">
            {list.map((c) => (
              <Link key={c.id} to="/messages/$id" params={{ id: c.id }} className={`flex items-center gap-3 p-4 hover:bg-muted ${path === `/messages/${c.id}` ? "bg-primary-soft" : ""}`}>
                <UserAvatar src={c.other?.avatar_url} name={c.other?.full_name} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><p className="truncate font-semibold">{c.other?.full_name || "Member"}</p><span className="shrink-0 text-xs text-muted-foreground">{c.last ? timeAgo(c.last.sent_at) : ""}</span></div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${c.unread ? "font-semibold" : "text-muted-foreground"}`}>{c.last ? `${c.last.sender_id === user?.id ? "You: " : ""}${c.last.content}` : "Say hello 👋"}</p>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
