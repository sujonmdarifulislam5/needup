import { describe, expect, it } from "vitest";
import { publicUrl } from "@/lib/native";

describe("share links", () => {
  it("uses the real website address instead of the phone app's localhost", () => {
    // jsdom runs on localhost, just like the Android app
    expect(publicUrl("/post/abc")).toBe("https://aspirolabs.store/post/abc");
  });
});
