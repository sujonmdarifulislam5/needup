// Public website address used for share links (the phone app itself runs on https://localhost).
export const SITE_URL = (import.meta.env["VITE_PUBLIC_SITE_URL"] as string | undefined) || "https://aspirolabs.store";

export function publicUrl(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocal = !origin || /localhost|127\.0\.0\.1|capacitor:/.test(origin);
  return `${isLocal ? SITE_URL : origin}${path}`;
}

/** Deep link the phone app opens after Google sign-in (add it to the backend's Redirect URLs). */
export const NATIVE_AUTH_REDIRECT = "com.needup.app://auth-callback";
const SESSION_KEY = "needup-session-backup";

export async function isNative() {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

/** Keep a copy of the sign-in in the phone's app storage so it survives WebView storage clears. */
export async function backupNativeSession(session: { access_token: string; refresh_token: string } | null) {
  if (!(await isNative())) return;
  const { Preferences } = await import("@capacitor/preferences");
  if (session) await Preferences.set({ key: SESSION_KEY, value: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }) });
  else await Preferences.remove({ key: SESSION_KEY });
}

let restoring: Promise<void> | null = null;
/** On app start, bring back the saved sign-in if the WebView lost it. */
export function restoreNativeSession() {
  restoring ??= (async () => {
    if (!(await isNative())) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (!value) return;
    try {
      const saved = JSON.parse(value) as { access_token: string; refresh_token: string };
      const { error } = await supabase.auth.setSession(saved);
      if (error) await Preferences.remove({ key: SESSION_KEY });
    } catch { await Preferences.remove({ key: SESSION_KEY }); }
  })();
  return restoring;
}

/** Google sign-in inside the phone app: open the system browser, come back via deep link. */
export async function nativeGoogleSignIn() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) throw error ?? new Error("no url");
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });
}

/** Handle the deep link that brings the user back from Google. */
export async function setupAuthDeepLink(onDone: () => void) {
  if (!(await isNative())) return () => {};
  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
    const { Browser } = await import("@capacitor/browser");
    void Browser.close().catch(() => {});
    const { supabase } = await import("@/integrations/supabase/client");
    const u = new URL(url.replace("#", url.includes("?") ? "&" : "?"));
    const code = u.searchParams.get("code");
    const access_token = u.searchParams.get("access_token");
    const refresh_token = u.searchParams.get("refresh_token");
    if (code) await supabase.auth.exchangeCodeForSession(code);
    else if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
    onDone();
  });
  return () => { void handle.remove(); };
}

/** Android hardware back: go to the previous page; exit only from the home page. */
export async function setupBackButton(goBack: () => void, isHome: () => boolean) {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("backButton", ({ canGoBack }) => {
    if (!isHome() && (canGoBack || window.history.length > 1)) goBack();
    else if (!isHome()) window.location.replace("/");
    else void App.exitApp();
  });
  return () => { void handle.remove(); };
}

/** Brand-coloured phone status bar + keyboard height tracking (sets --kb CSS var). */
export async function setupNativeChrome() {
  const setKb = (h: number) => document.documentElement.style.setProperty("--kb", `${Math.max(0, Math.round(h))}px`);
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const onVv = () => { if (vv) setKb(window.innerHeight - vv.height - vv.offsetTop); };
  vv?.addEventListener("resize", onVv);
  const cleanups: (() => void)[] = [() => vv?.removeEventListener("resize", onVv)];
  if (await isNative()) {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: "#0f766e" });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch { /* not available */ }
    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      const a = await Keyboard.addListener("keyboardWillShow", (i) => { document.documentElement.classList.add("kb-open"); void i; setTimeout(() => (document.activeElement as HTMLElement | null)?.scrollIntoView({ block: "center" }), 50); });
      const b = await Keyboard.addListener("keyboardWillHide", () => { document.documentElement.classList.remove("kb-open"); });
      cleanups.push(() => { void a.remove(); void b.remove(); });
    } catch { /* not available */ }
  }
  return () => cleanups.forEach((c) => c());
}

/** Open the phone's share menu (WhatsApp, Messenger, Telegram, Facebook, Copy link…). Returns false if unsupported. */
export async function sharePost(opts: { title: string; text: string; url: string }) {
  if (await isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ ...opts, dialogTitle: "Share post" });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.share) { await navigator.share(opts); return true; }
  return false;
}
