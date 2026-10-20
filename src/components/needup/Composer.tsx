import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, MapPin, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbPostType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { friendly, uploadImage } from "@/lib/media";
import { useMyCommunity } from "./AppShell";
import { UserAvatar } from "./Avatar";

export function Composer({ type, emoji, title, placeholder, button, soft, children, showLocation, postTitle }: {
  type: DbPostType; emoji: string; title: string; placeholder: string; button: string; soft: string;
  children?: ReactNode; showLocation?: boolean; postTitle?: string | undefined;
}) {
  const { user, profile } = useAuth();
  const { community } = useMyCommunity();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [loc, setLoc] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const approx = profile?.location_name || community?.location_name?.split(",")[0] || community?.name || null;

  const pick = (f?: File) => {
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user || !text.trim()) return;
    setBusy(true); setError(null);
    try {
      const image_url = file ? await uploadImage("post-images", user.id, file) : null;
      const { error } = await supabase.from("posts").insert({
        user_id: user.id, post_type: type, content: text.trim(), title: postTitle ?? null,
        community_id: community?.id ?? null, location_name: showLocation && !loc ? null : approx, image_url,
      });
      if (error) throw error;
      toast.success("Posted to your community");
      setText(""); setFile(null); setPreview(null);
      await qc.invalidateQueries({ queryKey: ["posts"] });
      nav({ to: "/" });
    } catch (e) {
      setError(friendly(e, "We couldn't publish your post. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <div className="px-4 pt-4 md:px-0 md:pt-0">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="card-surface p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${soft}`}>{emoji}</span>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-7 w-7 text-[10px]" /> Posting to <b className="text-foreground">{community?.name ?? "your community"}</b></div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={6} maxLength={5000} className="mt-4 w-full resize-none rounded-2xl border bg-muted/50 p-4 text-lg outline-none transition focus:border-primary focus:bg-card" />
        {children}
        {preview && (
          <div className="relative mt-4 overflow-hidden rounded-2xl">
            <img src={preview} alt="" className="max-h-72 w-full object-cover" />
            <button onClick={() => { setFile(null); setPreview(null); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-card shadow-card" aria-label="Remove photo"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:border-primary"><ImagePlus className="h-5 w-5 text-primary" /> {file ? "Change photo" : "Add photo"}</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {showLocation && (
            <button onClick={() => setLoc(!loc)} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${loc ? "border-primary bg-primary-soft" : "hover:border-primary"}`}><MapPin className="h-5 w-5 text-primary" /> {loc ? `${approx ?? "Community"} (approx.)` : "Add approximate location"}</button>
          )}
        </div>
        {error && <p className="mt-4 rounded-xl bg-need-soft px-4 py-3 text-sm font-medium text-need">{error}</p>}
        <button disabled={!text.trim() || busy} onClick={submit} className="mt-6 w-full rounded-2xl bg-brand py-4 text-lg font-bold text-primary-foreground shadow-lift transition disabled:opacity-50">{busy ? "Posting…" : button}</button>
      </div>
    </div>
  );
}

export function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(value === o ? "" : o)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${value === o ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>{o}</button>
      ))}
    </div>
  );
}
