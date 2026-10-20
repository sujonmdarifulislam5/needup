import { supabase } from "@/integrations/supabase/client";
import village from "@/assets/village.jpg";
import dhaka from "@/assets/dhaka.jpg";

export type DbPostType = "NEED" | "CAN_HELP" | "WORK" | "GENERAL";

export const typeMeta: Record<DbPostType, { label: string; emoji: string; badge: string }> = {
  NEED: { label: "NEED", emoji: "🆘", badge: "bg-need-soft text-need" },
  CAN_HELP: { label: "CAN HELP", emoji: "🤝", badge: "bg-help-soft text-help" },
  WORK: { label: "WORK", emoji: "💼", badge: "bg-work-soft text-work" },
  GENERAL: { label: "POST", emoji: "📝", badge: "bg-general-soft text-general" },
};

export type Author = { id: string; full_name: string; username: string | null; avatar_url: string | null };
export type FeedPost = {
  id: string;
  user_id: string;
  post_type: DbPostType;
  status: "open" | "closed";
  title: string | null;
  content: string;
  image_url: string | null;
  location_name: string | null;
  community_id: string | null;
  created_at: string;
  author: Author | null;
  community: { name: string } | null;
  post_likes: { user_id: string }[];
  comments: { count: number }[];
};

export type Community = { id: string; slug: string; name: string; description: string | null; location_name: string | null; cover_url: string | null };

const localCovers: Record<string, string> = { saronkhola: village, dhaka };
export const coverFor = (c: Pick<Community, "slug" | "cover_url">) => localCovers[c.slug] ?? c.cover_url ?? village;

export const POST_SELECT =
  "id,user_id,post_type,status,title,content,image_url,location_name,community_id,created_at,author:profiles!posts_user_id_fkey(id,full_name,username,avatar_url),community:communities(name),post_likes(user_id),comments(count)";

export async function fetchPosts(opts: { communityIds?: string[] | undefined; type?: DbPostType | undefined; userId?: string | undefined; limit?: number } = {}) {
  let q = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.communityIds) q = q.in("community_id", opts.communityIds.length ? opts.communityIds : ["00000000-0000-0000-0000-000000000000"]);
  if (opts.type) q = q.eq("post_type", opts.type);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function fetchPost(id: string) {
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as FeedPost | null;
}

export async function fetchCommunities() {
  const { data, error } = await supabase.from("communities").select("id,slug,name,description,location_name,cover_url").order("created_at");
  if (error) throw error;
  return data as Community[];
}

export async function fetchMyCommunityIds(userId: string) {
  const { data, error } = await supabase.from("user_communities").select("community_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.community_id);
}

export async function startConversation(otherId: string) {
  const { data, error } = await supabase.rpc("start_conversation", { _other: otherId });
  if (error) throw error;
  return data as string;
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString();
}

export const initials = (name?: string | null) => (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
