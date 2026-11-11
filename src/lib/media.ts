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

/** Shrink big phone photos (to max 1600px, JPEG) before upload so posting is fast on mobile data. */
async function compress(file: File, maxSide = 1600): Promise<File> {
  if (file.type === "image/gif" || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

export async function uploadImage(bucket: Bucket, userId: string, original: File): Promise<string> {
  if (!OK.includes(original.type)) throw new Error("Please choose a JPG, PNG, WEBP or GIF image.");
  const file = await compress(original, bucket === "avatars" ? 800 : 1600);
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
