import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/needup/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NeedUp" },
      { name: "description", content: "How NeedUp collects, uses and protects your information." },
      { property: "og:title", content: "Privacy Policy — NeedUp" },
      { property: "og:description", content: "How NeedUp handles your data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

const sections: [string, string][] = [
  ["What we collect", "Your name, email, profile photo, bio, chosen community and the posts, comments and messages you create. We never collect or show your exact home address — only your community or approximate area."],
  ["How we use it", "To run NeedUp: showing your posts to your community, delivering messages and notifications, and keeping your account signed in."],
  ["Who can see it", "Posts, comments and your public profile are visible to other users. Messages are private between the two people in the conversation."],
  ["Sharing", "We do not sell your data. We only use trusted service providers needed to host the app and send sign-in emails."],
  ["Deleting your account", "You can delete your account any time from Profile → Delete account. This permanently removes your profile, posts, comments, messages and notifications."],
  ["Contact", "Questions? Email us at support@aspirolabs.store."],
];

function Privacy() {
  return (
    <div className="px-4 pb-10 md:px-0">
      <PageHeader title="Privacy Policy" sub="Last updated: November 2026" />
      <div className="card-surface space-y-5 p-5">
        {sections.map(([h, t]) => (
          <section key={h}><h2 className="font-bold">{h}</h2><p className="mt-1 text-muted-foreground">{t}</p></section>
        ))}
      </div>
      <Link to="/" className="mt-5 inline-block text-sm font-semibold text-primary">← Back to NeedUp</Link>
    </div>
  );
}
