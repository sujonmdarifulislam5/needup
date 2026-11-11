import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Share2, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type DbPostType, type FeedPost, startConversation, timeAgo, typeMeta } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canOfferHelp } from "@/lib/interactions";
import { UserAvatar, MediaImage } from "./Avatar";
import { useT } from "@/lib/i18n";
import { publicUrl, sharePost } from "@/lib/native";

export function TypeBadge({ type }: { type: DbPostType }) {
  const m = typeMeta[type];
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider ${m.badge}`}>{m.emoji} {m.label}</span>;
}

export function usePostActions(post: FeedPost) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const requireUser = () => {
    if (!user) { toast("Please sign in first"); nav({ to: "/auth" }); return null; }
    return user;
  };
  const message = async () => {
    const u = requireUser(); if (!u || busy) return;
    setBusy(true);
    try {
      const id = await startConversation(post.user_id);
      nav({ to: "/messages/$id", params: { id } });
    } catch { toast.error("Couldn't open the chat. Please try again."); }
    finally { setBusy(false); }
  };
  const canHelp = async () => {
    const u = requireUser(); if (!u || busy) return;
    if (!canOfferHelp(post, u.id)) { toast.error("This need is no longer accepting help."); return; }
    setBusy(true);
    const { error } = await supabase.from("need_responses").insert({ post_id: post.id, responder_id: u.id });
    setBusy(false);
    if (error && error.code !== "23505") { toast.error("Couldn't send your offer. Please try again."); return; }
    toast.success(error ? "You already offered to help with this." : "Thank you! The owner has been notified.", {
      action: { label: "Message", onClick: () => void message() },
    });
  };
  return { message, canHelp, busy, isOwn: user?.id === post.user_id };
}

export function PostCard({ post, full }: { post: FeedPost; full?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [liked, setLiked] = useState(!!user && post.post_likes.some((l) => l.user_id === user.id));
  const [likes, setLikes] = useState(post.post_likes.length);
  const { message, canHelp, busy, isOwn } = usePostActions(post);
  const comments = post.comments[0]?.count ?? 0;
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);

  const toggleLike = async () => {
    if (!user) { toast("Please sign in to like posts"); nav({ to: "/auth" }); return; }
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    if (error && error.code !== "23505") { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); toast.error("Couldn't update like."); }
    else qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const share = async () => {
    const url = publicUrl(`/post/${post.id}`);
    try {
      if (!(await sharePost({ title: "NeedUp", text: post.content.slice(0, 80), url }))) { await navigator.clipboard.writeText(url); toast.success(t("linkCopied")); }
    } catch { /* cancelled */ }
  };
  const long = !full && (post.content.length > 300 || post.content.split("\n").length > 6);

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { toast.error("Couldn't delete the post."); return; }
    toast.success("Post deleted");
    qc.invalidateQueries({ queryKey: ["posts"] });
    if (full) nav({ to: "/" });
  };

  const showCta = !isOwn && post.post_type !== "GENERAL" && post.status !== "closed";
  return (
    <article className="card-surface overflow-hidden">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <UserAvatar src={post.author?.avatar_url} name={post.author?.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{post.author?.full_name || "NeedUp member"}</p>
            <TypeBadge type={post.post_type} />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{post.location_name || post.community?.name || "Community"} · {timeAgo(post.created_at)}</span>
          </p>
        </div>
      </div>
      <Link to="/post/$id" params={{ id: post.id }} className="block">
        {post.status === "closed" && <p className="px-4 pb-2 text-sm font-semibold text-muted-foreground sm:px-5">Closed</p>}
        {post.title && <p className="px-4 pb-1 text-sm font-semibold text-accent-foreground sm:px-5">{post.title}</p>}
        <p className={`whitespace-pre-line break-words px-4 leading-relaxed sm:px-5 ${full ? "text-lg" : "text-[17px]"} ${long && !expanded ? "line-clamp-5 pb-1" : "pb-4"}`}>{post.content}</p>
        {long && (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded((v) => !v); }} className="px-4 pb-4 text-sm font-semibold text-primary sm:px-5">
            {expanded ? t("seeLess") : `… ${t("seeMore")}`}
          </button>
        )}
        {post.image_url && <MediaImage src={post.image_url} className="aspect-[5/3] w-full object-cover" />}
      </Link>
      <div className="flex items-center gap-1 border-t px-2 py-2 sm:px-3">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted ${liked ? "text-need" : "text-muted-foreground"}`} aria-label="Like">
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} /> {likes}
        </button>
        <Link to="/post/$id" params={{ id: post.id }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <MessageCircle className="h-5 w-5" /> {comments}
        </Link>
        <button onClick={share} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <Share2 className="h-5 w-5" /> <span className="hidden sm:inline">{t("share")}</span>
        </button>
        {isOwn && (
          <button onClick={remove} className="ml-auto rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Delete post"><Trash2 className="h-5 w-5" /></button>
        )}
        {showCta && !full && (
          <button disabled={busy} onClick={post.post_type === "NEED" ? canHelp : message} className={`ml-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-60 ${post.post_type === "NEED" ? "bg-primary text-primary-foreground" : "bg-primary-soft text-accent-foreground"}`}>
            {post.post_type === "NEED" ? "🤝 I Can Help" : "💬 Message"}
          </button>
        )}
      </div>
    </article>
  );
}
