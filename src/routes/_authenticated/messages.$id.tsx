import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/needup/Avatar";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Chat — NeedUp" },
      { name: "description", content: "Private conversation on NeedUp." },
      { property: "og:title", content: "Chat — NeedUp" },
      { property: "og:description", content: "Private conversation on NeedUp." },
    ],
  }),
  component: Chat,
});

type Msg = { id: string; sender_id: string; content: string; sent_at: string; is_read: boolean };

function Chat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const other = useQuery({
    queryKey: ["conv-other", id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("conversation_participants").select("profile:profiles(id,full_name,avatar_url)").eq("conversation_id", id).neq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return (data?.profile ?? null) as { id: string; full_name: string; avatar_url: string | null } | null;
    },
  });
  const msgs = useQuery({
    queryKey: ["messages", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id,sender_id,content,sent_at,is_read").eq("conversation_id", id).order("sent_at").limit(300);
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`conv-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user, qc]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
    if (!user || !msgs.data?.some((m) => m.sender_id !== user.id && !m.is_read)) return;
    void supabase.from("messages").update({ is_read: true }).eq("conversation_id", id).neq("sender_id", user.id).eq("is_read", false)
      .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }));
  }, [msgs.data, id, user, qc]);

  const send = async () => {
    const t = text.trim();
    if (!t || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content: t });
    setSending(false);
    if (error) { toast.error("Message not sent. Please try again."); return; }
    setText("");
    qc.invalidateQueries({ queryKey: ["messages", id] });
  };

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col md:card-surface md:h-[calc(100dvh-3rem)] md:overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Link to="/messages" className="rounded-full p-1.5 hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <UserAvatar src={other.data?.avatar_url} name={other.data?.full_name} className="h-10 w-10" />
        <div className="min-w-0"><p className="truncate font-semibold">{other.data?.full_name || (other.isLoading ? "…" : "Conversation")}</p><p className="text-xs text-muted-foreground">NeedUp member</p></div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.isLoading && <p className="text-center text-sm text-muted-foreground">Loading messages…</p>}
        {msgs.isError && <p className="text-center text-sm text-muted-foreground">We couldn't load this conversation.</p>}
        {msgs.data && !msgs.data.length && <p className="text-center text-sm text-muted-foreground">No messages yet — say hello 👋</p>}
        {msgs.data?.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-card"}`}>
                <p className="whitespace-pre-line break-words">{m.content}</p><p className={`mt-0.5 text-[11px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmt(m.sent_at)}{mine ? ` · ${m.is_read ? "Read" : "Sent"}` : ""}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="flex items-center gap-2 border-t bg-card p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} maxLength={4000} placeholder="Type a message…" className="min-w-0 flex-1 rounded-full border bg-muted/50 px-4 py-2.5 outline-none focus:border-primary" />
        <Button onClick={send} disabled={sending || !text.trim() || other.isLoading || other.isError || !other.data} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground disabled:opacity-50" aria-label="Send"><Send className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
