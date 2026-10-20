import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostCard, usePostActions } from "@/components/needup/PostCard";
import { ErrorBox, Loading, UserAvatar } from "@/components/needup/Avatar";
import { fetchPost, timeAgo, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HelpOffers } from "@/components/needup/HelpOffers";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/post/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Post — NeedUp" },
      { name: "description", content: "A post from your NeedUp community." },
      { property: "og:title", content: "Post — NeedUp" },
      { property: "og:description", content: "A post from your NeedUp community." },
    ],
  }),
  component: Detail,
});

type Comment = { id: string; content: string; created_at: string; user_id: string; parent_id: string | null; author: { full_name: string; avatar_url: string | null } | null };

function Detail() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["posts", "detail", id], queryFn: () => fetchPost(id) });
  return (
    <div className="px-4 pt-4 md:px-0 md:pt-0">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorBox onRetry={() => q.refetch()} /> : !q.data ? <ErrorBox text="This post is no longer available." /> : <PostBody post={q.data} />}
    </div>
  );
}

function PostBody({ post }: { post: FeedPost }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { canHelp, message, busy, isOwn } = usePostActions(post);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const comments = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments").select("id,content,created_at,user_id,parent_id,author:profiles!comments_user_id_fkey(full_name,avatar_url)").eq("post_id", post.id).order("created_at");
      if (error) throw error;
      return data as unknown as Comment[];
    },
  });

  useEffect(() => {
    const channel = supabase.channel(`comments-${post.id}`).on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${post.id}` }, () => {
      void qc.invalidateQueries({ queryKey: ["comments", post.id] });
      void qc.invalidateQueries({ queryKey: ["posts"] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [post.id, qc]);

  const add = async () => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: user.id, content: text.trim(), parent_id: replyTo?.id ?? null });
    setSending(false);
    if (error) { toast.error("Couldn't post your comment."); return; }
    setText("");
    setReplyTo(null);
    toast.success(replyTo ? "Reply posted" : "Comment posted");
    qc.invalidateQueries({ queryKey: ["comments", post.id] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const del = async (cid: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", cid);
    if (error) { toast.error("Couldn't delete comment."); return; }
    qc.invalidateQueries({ queryKey: ["comments", post.id] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  return (
    <>
      <PostCard post={post} full />
      <HelpOffers post={post} />
      {!isOwn && post.status === "open" && post.post_type === "NEED" && (
        <button disabled={busy} onClick={canHelp} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-bold text-primary-foreground shadow-lift disabled:opacity-60">🤝 I Can Help</button>
      )}
      {!isOwn && post.status === "open" && (post.post_type === "CAN_HELP" || post.post_type === "WORK") && (
        <button disabled={busy} onClick={message} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-bold text-primary-foreground shadow-lift disabled:opacity-60">💬 Message</button>
      )}
      {!isOwn && post.status === "open" && post.post_type === "NEED" && (
        <button disabled={busy} onClick={message} className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold text-accent-foreground hover:bg-primary-soft">💬 Message {post.author?.full_name?.split(" ")[0] ?? "owner"}</button>
      )}
      <div className="card-surface mt-4 p-5">
        <h2 className="mb-4 font-bold">Comments</h2>
        {comments.isLoading ? <p className="text-muted-foreground">Loading comments…</p> : comments.isError ? <p className="text-muted-foreground">Couldn't load comments.</p> : (
          <div className="space-y-4">
            {!comments.data?.length && <p className="text-muted-foreground">No comments yet.</p>}
            {comments.data?.map((c) => (
              <div key={c.id} className={`flex gap-3 ${c.parent_id ? "ml-6" : ""}`}>
                <UserAvatar src={c.author?.avatar_url} name={c.author?.full_name} className="h-9 w-9" />
                <div className="min-w-0 flex-1 rounded-2xl bg-muted px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{c.author?.full_name || "Member"} <span className="font-normal text-muted-foreground">· {timeAgo(c.created_at)}</span></p>
                    {c.user_id === user?.id && <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete comment"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  {c.parent_id && <p className="mb-1 text-xs text-muted-foreground">Reply to {comments.data?.find((parent) => parent.id === c.parent_id)?.author?.full_name || "comment"}</p>}
                  <p className="whitespace-pre-line break-words">{c.content}</p>
                  {user && !c.parent_id && <Button variant="ghost" size="sm" onClick={() => setReplyTo(c)} className="mt-1 h-7 px-0 text-xs text-primary">Reply</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {replyTo && <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Replying to {replyTo.author?.full_name || "member"}</span><Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>Cancel</Button></div>}
        {user ? (
          <div className="mt-5 flex items-center gap-2">
            <UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-9 w-9" />
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} maxLength={2000} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-full border bg-muted/50 px-4 py-2.5 outline-none focus:border-primary" />
            <button disabled={sending || !text.trim()} onClick={add} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send"><Send className="h-4 w-4" /></button>
          </div>
        ) : (
          <Link to="/auth" className="mt-5 block rounded-2xl bg-muted py-3 text-center text-sm font-semibold text-accent-foreground">Sign in to comment</Link>
        )}
      </div>
    </>
  );
}
