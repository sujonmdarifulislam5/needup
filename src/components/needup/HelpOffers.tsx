import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar, ErrorBox, Loading } from "./Avatar";
import { canChangePostStatus } from "@/lib/interactions";
import { startConversation, type FeedPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function HelpOffers({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [chatIds, setChatIds] = useState<Record<string, string>>({});
  const own = canChangePostStatus(post.user_id, user?.id);
  const offers = useQuery({
    queryKey: ["help-offers", post.id, user?.id], enabled: own && post.post_type === "NEED",
    queryFn: async () => {
      const { data, error } = await supabase.from("need_responses").select("id,responder_id,profile:profiles!need_responses_responder_id_fkey(full_name,avatar_url)").eq("post_id", post.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!own) return;
    const channel = supabase.channel(`offers-${post.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "need_responses", filter: `post_id=eq.${post.id}` }, () => { void qc.invalidateQueries({ queryKey: ["help-offers", post.id] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [own, post.id, qc]);
  if (!own) return null;
  const toggleStatus = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("posts").update({ status: post.status === "open" ? "closed" : "open" }).eq("id", post.id).eq("user_id", user?.id ?? "");
    setBusy(false);
    if (error) { toast.error("Could not update post status."); return; }
    toast.success(post.status === "open" ? "Post closed" : "Post reopened");
    void qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const prepareChat = async (id: string) => {
    try { setChatIds((prev) => ({ ...prev, [id]: "" })); const chat = await startConversation(id); setChatIds((prev) => ({ ...prev, [id]: chat })); }
    catch { toast.error("Could not open conversation."); setChatIds((prev) => { const next = { ...prev }; delete next[id]; return next; }); }
  };
  return <section className="mt-4 space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Status: {post.status === "open" ? "Open" : "Closed"}</p><Button variant="outline" disabled={busy} onClick={toggleStatus}>{post.status === "open" ? "Close post" : "Reopen post"}</Button></div>
    {post.post_type === "NEED" && <div className="card-surface p-5"><h2 className="mb-4 font-bold">People offering help</h2>
      {offers.isLoading ? <Loading /> : offers.isError ? <ErrorBox onRetry={() => offers.refetch()} /> : !offers.data?.length ? <p className="text-muted-foreground">No help offers yet.</p> : <div className="space-y-3">{offers.data.map((offer) => <div key={offer.id} className="flex items-center gap-3"><UserAvatar name={offer.profile?.full_name} src={offer.profile?.avatar_url} /><p className="min-w-0 flex-1 truncate font-semibold">{offer.profile?.full_name || "Member"}</p>{chatIds[offer.responder_id] ? <Button asChild variant="outline"><Link to="/messages/$id" params={{ id: chatIds[offer.responder_id] ?? "" }}>Open chat</Link></Button> : <Button variant="outline" disabled={chatIds[offer.responder_id] === ""} onClick={() => prepareChat(offer.responder_id)}>Message</Button>}</div>)}</div>}
    </div>}
  </section>;
}