import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Composer, Chips } from "@/components/needup/Composer";

export const Route = createFileRoute("/_authenticated/create/work")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Post Work — NeedUp" },
      { name: "description", content: "Looking for work or a worker in your area." },
      { property: "og:title", content: "Post Work — NeedUp" },
      { property: "og:description", content: "Looking for work or a worker in your area." },
    ],
  }),
  component: Page,
});

function Page() {
  const [c, setC] = useState("Looking for Work");
  return (
    <Composer type="WORK" emoji="💼" soft="bg-work-soft" title="What work are you looking for?" placeholder="Describe the work…" button="Post Work" postTitle={c || undefined}>
      <Chips options={["Looking for Work", "Looking for Worker"]} value={c} onChange={setC} />
    </Composer>
  );
}
