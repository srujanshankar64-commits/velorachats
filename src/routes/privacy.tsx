import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const SITE = "https://velorachats.velorachats.workers.dev";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Velora" },
      { name: "description", content: "Velora privacy policy." },
      { property: "og:title", content: "Privacy — Velora" },
      { property: "og:url", content: SITE + "/privacy" },
      { name: "twitter:url", content: SITE + "/privacy" },
    ],
    links: [{ rel: "canonical", href: SITE + "/privacy" }],
  }),
  component: Privacy,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-5 surface border-soft">
      <h2 className="text-base text-1 mb-2">{title}</h2>
      <div className="text-sm text-2 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-[#0D0D0F] text-[#E8EAED]">
      <header className="h-14 px-4 flex items-center">
        <Link to="/" className="p-2 -ml-2" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base ml-1">Privacy</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 pb-10 space-y-3">
        <p className="text-xs text-3">Last updated January 2026</p>
        <Card title="What we collect">
          <p>Display name, age, state, gender, optional email, and messages you send. We log basic technical data (device, time) to keep Velora safe.</p>
        </Card>
        <Card title="How we use it">
          <p>To match you with people, deliver messages in real time, and review reports of abuse. Nothing else.</p>
        </Card>
        <Card title="What we don't do">
          <p>No ads. No selling your data. No tracking you across other sites.</p>
        </Card>
        <Card title="Data retention">
          <p>Messages are retained while your account is active. Delete your profile from Profile → Danger zone and your data is removed.</p>
        </Card>
        <Card title="Your rights">
          <p>You can delete your account anytime from your profile. You can also email us to request a copy of your data.</p>
        </Card>
        <Card title="Cookies">
          <p>We only use localStorage on your device to keep you signed in. No third-party tracking cookies.</p>
        </Card>
        <Card title="Contact">
          <p>privacy@velorachats.com</p>
        </Card>
      </main>
    </div>
  );
}
