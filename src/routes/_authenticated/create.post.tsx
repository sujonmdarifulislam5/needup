import { createFileRoute } from "@tanstack/react-router";
import { Composer } from "@/components/needup/Composer";

export const Route = createFileRoute("/_authenticated/create/post")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "New Post — NeedUp" },
      { name: "description", content: "Share something with your community." },
      { property: "og:title", content: "New Post — NeedUp" },
      { property: "og:description", content: "Share something with your community." },
    ],
  }),
  component: Page,
});

function Page() {
  return <Composer type="GENERAL" emoji="📝" soft="bg-general-soft" title="Share with your community" placeholder="What's on your mind?" button="Post" />;
}
