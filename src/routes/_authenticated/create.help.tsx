import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Composer, Chips } from "@/components/needup/Composer";

export const Route = createFileRoute("/_authenticated/create/help")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Offer Help — NeedUp" },
      { name: "description", content: "Tell your community how you can help." },
      { property: "og:title", content: "Offer Help — NeedUp" },
      { property: "og:description", content: "Tell your community how you can help." },
    ],
  }),
  component: Page,
});

function Page() {
  const [c, setC] = useState("");
  return (
    <Composer type="CAN_HELP" emoji="🤝" soft="bg-help-soft" title="What can you help with?" placeholder="I can help with…" button="Post Offer" postTitle={c || undefined}>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">General skill (optional)</p>
      <Chips options={["Repair", "Teaching", "Cooking", "Driving", "Design", "Health", "Other"]} value={c} onChange={setC} />
    </Composer>
  );
}
