import { describe, expect, it } from "vitest";
import { canOfferHelp, canChangePostStatus } from "@/lib/interactions";

describe("Post interaction rules", () => {
  it("only lets an owner change post status", () => {
    expect(canChangePostStatus("owner", "owner")).toBe(true);
    expect(canChangePostStatus("owner", "other")).toBe(false);
    expect(canChangePostStatus("owner", undefined)).toBe(false);
  });
  it("only accepts help for another user's open need", () => {
    const post = { user_id: "owner", post_type: "NEED", status: "open" };
    expect(canOfferHelp(post, "helper")).toBe(true);
    expect(canOfferHelp(post, "owner")).toBe(false);
    expect(canOfferHelp(post, undefined)).toBe(false);
    expect(canOfferHelp({ ...post, status: "closed" }, "helper")).toBe(false);
    expect(canOfferHelp({ ...post, post_type: "GENERAL" }, "helper")).toBe(false);
  });
});