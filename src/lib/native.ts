// Public website address used for share links (the phone app itself runs on https://localhost).
export const SITE_URL = (import.meta.env["VITE_PUBLIC_SITE_URL"] as string | undefined) || "https://aspirolabs.store";

export function publicUrl(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocal = !origin || /localhost|127\.0\.0\.1|capacitor:/.test(origin);
  return `${isLocal ? SITE_URL : origin}${path}`;
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
