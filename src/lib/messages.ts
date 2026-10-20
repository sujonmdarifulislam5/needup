import { supabase } from "@/integrations/supabase/client";

export type ConvSummary = {
  id: string;
  other: { id: string; full_name: string; avatar_url: string | null } | null;
  last: { content: string; sent_at: string; sender_id: string } | null;
  unread: number;
  updated_at: string;
};

export async function fetchConversations(me: string): Promise<ConvSummary[]> {
  const { data: mine, error } = await supabase.from("conversation_participants").select("conversation_id, conversation:conversations(updated_at)").eq("user_id", me);
  if (error) throw error;
  const ids = (mine ?? []).map((r) => r.conversation_id);
  if (!ids.length) return [];
  const [parts, msgs] = await Promise.all([
    supabase.from("conversation_participants").select("conversation_id, profile:profiles(id,full_name,avatar_url)").in("conversation_id", ids).neq("user_id", me),
    supabase.from("messages").select("conversation_id,content,sent_at,sender_id,is_read").in("conversation_id", ids).order("sent_at", { ascending: false }).limit(500),
  ]);
  if (parts.error || msgs.error) throw new Error("load");
  return (mine ?? []).map((r) => {
    const conv = r.conversation as unknown as { updated_at: string } | null;
    const other = (parts.data ?? []).find((p) => p.conversation_id === r.conversation_id)?.profile as ConvSummary["other"];
    const list = (msgs.data ?? []).filter((m) => m.conversation_id === r.conversation_id);
    return {
      id: r.conversation_id, other,
      last: list[0] ?? null,
      unread: list.filter((m) => !m.is_read && m.sender_id !== me).length,
      updated_at: list[0]?.sent_at ?? conv?.updated_at ?? "",
    };
  }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
