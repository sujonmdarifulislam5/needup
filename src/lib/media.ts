import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Bucket = "avatars" | "post-images";
const MAX: Record<Bucket, number> = { avatars: 3 * 1024 * 1024, "post-images": 8 * 1024 * 1024 };
const OK = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Stored values are either full URLs or "bucket/path" references to private storage. */
export function useMediaUrl(ref: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["media", ref],
    enabled: !!ref && !ref.startsWith("http"),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const [bucket, ...rest] = ref!.split("/");
      const { data } = await supabase.storage.from(bucket!).createSignedUrl(rest.join("/"), 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
  if (!ref) return null;
  return ref.startsWith("http") ? ref : (data ?? null);
}

export async function uploadImage(bucket: Bucket, userId: string, file: File): Promise<string> {
  if (!OK.includes(file.type)) throw new Error("Please choose a JPG, PNG, WEBP or GIF image.");
  if (file.size > MAX[bucket]) throw new Error(`Image is too large (max ${MAX[bucket] / 1024 / 1024} MB).`);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw new Error("Image upload failed. Please try again.");
  return `${bucket}/${path}`;
}

/** Friendly error text — never show raw database errors. */
export function friendly(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (e instanceof Error && /image|large|choose/i.test(e.message)) return e.message;
  return fallback;
}
