import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety at ShhChats" },
      { name: "description", content: "ShhChats community guidelines, how to report abuse, moderation timelines, and the privacy controls that keep late-night chats safe." },
      { property: "og:title", content: "Safety at ShhChats" },
      { property: "og:description", content: "Community guidelines, reporting, and privacy controls at ShhChats." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shhchats.in/safety" },
    ],
    links: [{ rel: "canonical", href: "https://shhchats.in/safety" }],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <header className="h-14 px-5 flex items-center">
        <Link to="/" className="p-2 -ml-2 text-[#888]"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></Link>
      </header>
      <main className="px-6 pb-12 max-w-xl mx-auto">
        <h1 className="text-[32px] mb-8">Safety at ShhChats</h1>
        <Section title="Community guidelines">
          Be kind. No harassment. No explicit content. No sharing personal info.
        </Section>
        <Section title="How to report">
          Use the report button inside any chat to flag a user. You can also email us directly at safety@shhchats.in — we review all reports within 24 hours.
        </Section>
        <Section title="Privacy">
          We don't store your messages longer than needed. Guest sessions are anonymous. No data is sold.
        </Section>
        <Section title="Contact">
          <a className="text-[#7C3AED]" href="mailto:safety@shhchats.in">safety@shhchats.in</a>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg mb-2">{title}</h2>
      <p className="text-[15px] text-[#888] leading-relaxed">{children}</p>
    </section>
  );
}
