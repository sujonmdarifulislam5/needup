import { createFileRoute } from "@tanstack/react-router";
import { Composer } from "@/components/needup/Composer";

export const Route = createFileRoute("/_authenticated/create/need")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Post a Need — NeedUp" },
      { name: "description", content: "Tell your neighbors what you need." },
      { property: "og:title", content: "Post a Need — NeedUp" },
      { property: "og:description", content: "Tell your neighbors what you need." },
    ],
  }),
  component: Page,
});

function Page() {
  return <Composer type="NEED" emoji="🆘" soft="bg-need-soft" title="What do you need?" placeholder="যেমন: আজকের মধ্যে একজন electrician দরকার…" button="Post Need" showLocation />;
}
