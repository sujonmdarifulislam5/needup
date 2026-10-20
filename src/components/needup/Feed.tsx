import { useQuery } from "@tanstack/react-query";
import { fetchPosts, type DbPostType } from "@/lib/api";
import { PostCard } from "./PostCard";
import { Empty, ErrorBox, Loading } from "./Avatar";

export function Feed({ queryKey, communityIds, type, userId, emptyTitle = "No posts yet", emptyText = "Be the first to share something with your community." }: {
  queryKey: unknown[]; communityIds?: string[] | undefined; type?: DbPostType | undefined; userId?: string | undefined; emptyTitle?: string; emptyText?: string;
}) {
  const q = useQuery({ queryKey: ["posts", ...queryKey], queryFn: () => fetchPosts({ communityIds, type, userId }) });
  if (q.isLoading) return <Loading label="Loading feed" />;
  if (q.isError) return <ErrorBox text="We couldn't load the feed." onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <Empty title={emptyTitle} text={emptyText} />;
  return <div className="space-y-4">{q.data.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}
