import { createFileRoute } from "@tanstack/react-router";
import { ConversationList } from "./messages";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Inbox — NeedUp" }, { name: "description", content: "Your private NeedUp conversations and unread messages." }, { property: "og:title", content: "Inbox — NeedUp" }, { property: "og:description", content: "Your private NeedUp conversations and unread messages." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ConversationList,
});
