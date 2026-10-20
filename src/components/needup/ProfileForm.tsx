import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { friendly, uploadImage } from "@/lib/media";
import { useMyCommunity } from "./AppShell";
import { UserAvatar } from "./Avatar";
import { Field, primaryBtn } from "./AuthLayout";

export function ProfileForm({ submitLabel, onDone, withCommunity }: { submitLabel: string; onDone: () => void; withCommunity?: boolean }) {
  const { user, profile, refreshProfile } = useAuth();
  const { communities } = useMyCommunity();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [communityId, setCommunityId] = useState(profile?.community_id ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f || !user) return;
    setUploading(true); setError(null);
    try { setAvatar(await uploadImage("avatars", user.id, f)); }
    catch (e) { setError(friendly(e, "Image upload failed. Please try again.")); }
    finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    const u = username.trim().toLowerCase();
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[a-z0-9_]{3,30}$/.test(u)) return setError("Username: 3–30 letters, numbers or _.");
    setBusy(true); setError(null);
    const { error } = await supabase.from("profiles").update({
      full_name: name.trim(), username: u, bio: bio.trim() || null, avatar_url: avatar,
      ...(withCommunity && communityId ? { community_id: communityId, location_name: communities.find((c) => c.id === communityId)?.location_name?.split(",")[0] ?? null } : {}),
      onboarded: true,
    }).eq("id", user.id);
    if (!error && withCommunity && communityId) {
      await supabase.from("user_communities").upsert({ user_id: user.id, community_id: communityId }, { onConflict: "user_id,community_id", ignoreDuplicates: true });
    }
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "That username is taken." : "We couldn't save your profile.");
    await refreshProfile();
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative">
          <UserAvatar src={avatar} name={name} className="h-24 w-24 text-2xl" />
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-card"><Camera className="h-4 w-4" /></span>
        </button>
        <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Profile photo (optional)"}</span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
      <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} required />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} placeholder="What do you do? How can you help?" className="w-full resize-none rounded-2xl border bg-card px-4 py-3 outline-none focus:border-primary" />
      </label>
      {withCommunity && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Your community</span>
          <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} className="w-full rounded-2xl border bg-card px-4 py-3.5 outline-none focus:border-primary">
            {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">🔒 We only show your community — never your home address.</span>
        </label>
      )}
      {error && <p className="rounded-xl bg-need-soft px-4 py-3 text-sm font-medium text-need">{error}</p>}
      <button disabled={busy || uploading} className={primaryBtn}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
