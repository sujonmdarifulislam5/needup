import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync } from "node:fs";

// `npm run build:android` writes index.html to one of these folders depending on the machine.
const webDir = existsSync(".output/public/index.html") ? ".output/public" : "dist/client";

const config: CapacitorConfig = {
  appId: "com.needup.app",
  appName: "NeedUp",
  webDir,
  // Keep the app below the phone's clock/battery bar on Android 15+.
  android: { adjustMarginsForEdgeToEdge: "auto" },
  plugins: {
    StatusBar: { overlaysWebView: false, backgroundColor: "#0f766e", style: "DARK" },
    Keyboard: { resize: "native", resizeOnFullScreen: true },
  },
};

export default config;
