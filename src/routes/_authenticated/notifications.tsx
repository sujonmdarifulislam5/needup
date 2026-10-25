import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/needup/AppShell";
import { Empty, ErrorBox, Loading, UserAvatar } from "@/components/needup/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Notifications — NeedUp" },
      { name: "description", content: "Comments, help offers and messages from your community." },
      { property: "og:title", content: "Notifications — NeedUp" },
      { property: "og:description", content: "Stay updated with your community." },
    ],
  }),
  component: Notifications,
});

type N = { id: string; type: "like" | "comment" | "help" | "message"; is_read: boolean; created_at: string; post_id: string | null; conversation_id: string | null; actor: { full_name: string; avatar_url: string | null } | null };
const icon = { like: "❤️", comment: "💬", help: "🤝", message: "✉️" };
const text = (n: N) => {
  const who = n.actor?.full_name || "Someone";
  return n.type === "like" ? `${who} liked your post.` : n.type === "comment" ? `${who} commented on your post.` : n.type === "help" ? `${who} wants to help with your Need.` : `${who} sent you a message.`;
};

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [marking, setMarking] = useState(false);
  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,type,is_read,created_at,post_id,conversation_id,actor:profiles!notifications_actor_id_fkey(full_name,avatar_url)").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as unknown as N[];
    },
  });
  // Opening this page counts as reading: clear the red badge (dots stay until you leave so you can see what's new).
  const hasUnread = !!q.data?.some((n) => !n.is_read);
  useEffect(() => {
    if (!user || !hasUnread) return;
    void supabase.from("notifications").update({ is_read: true }).eq("is_read", false).eq("user_id", user.id)
      .then(({ error }) => { if (!error) void qc.invalidateQueries({ queryKey: ["notif-unread"] }); });
    return () => { void qc.invalidateQueries({ queryKey: ["notifications"] }); };
  }, [user, hasUnread, qc]);
  const markAll = async () => {
    if (!user || marking) return;
    setMarking(true);
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false).eq("user_id", user.id);
    setMarking(false);
    if (error) { toast.error("Could not mark notifications read."); return; }
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
  };
  const open = (n: N) => {
    if (!n.is_read) void supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(({ error }) => {
      if (error) { toast.error("Could not mark notification read."); return; }
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notif-unread"] });
    });
  };

  return (
    <div>
      <PageHeader title="Notifications" right={<Button variant="ghost" disabled={marking || !q.data?.some((n) => !n.is_read)} onClick={markAll} className="text-sm font-semibold text-primary">Mark all read</Button>} />
      <div className="mx-4 md:mx-0">
        {q.isLoading ? <Loading /> : q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : !q.data?.length ? <Empty title="You're all caught up" text="Likes, comments, help offers and messages will show up here." /> : (
          <div className="card-surface divide-y overflow-hidden">
            {q.data.map((n) => {
              const body = (
                <>
                  <div className="relative shrink-0">
                    <UserAvatar src={n.actor?.avatar_url} name={n.actor?.full_name} className="h-12 w-12" />
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-card text-sm shadow-card">{icon[n.type]}</span>
                  </div>
                  <div className="min-w-0 flex-1"><p className={n.is_read ? "" : "font-semibold"}>{text(n)}</p><p className="text-sm text-muted-foreground">{timeAgo(n.created_at)} ago</p></div>
                  {!n.is_read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                </>
              );
              const cls = `flex items-center gap-3 p-4 hover:bg-muted ${n.is_read ? "" : "bg-primary-soft/60"}`;
              return n.conversation_id ? <Link key={n.id} to="/messages/$id" params={{ id: n.conversation_id }} onClick={() => open(n)} className={cls}>{body}</Link>
                : n.post_id ? <Link key={n.id} to="/post/$id" params={{ id: n.post_id }} onClick={() => open(n)} className={cls}>{body}</Link>
                : <div key={n.id} className={cls}>{body}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
