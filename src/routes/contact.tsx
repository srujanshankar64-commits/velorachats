import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const res = await fetch("https://formspree.io/f/xkoaglzr", {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    setLoading(false);
    if (res.ok) setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <a href="/" className="text-sm text-muted-foreground hover:underline">← Back</a>
        <h1 className="text-2xl font-medium mt-4 mb-2">Contact us</h1>
        <p className="text-muted-foreground text-sm mb-6">Questions, feedback, or reports — we'll get back to you.</p>

        {sent ? (
          <div className="p-4 rounded-lg border text-sm">Thanks! We'll get back to you within 24 hours.</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input name="name" type="text" placeholder="Your name" required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            <input name="email" type="email" placeholder="Your email" required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            <select name="topic" required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
              <option value="">Select a topic</option>
              <option value="safety">Safety / Report abuse</option>
              <option value="privacy">Privacy / Data request</option>
              <option value="support">General support</option>
              <option value="feedback">Feedback</option>
              <option value="partnership">Partnership</option>
            </select>
            <textarea name="message" placeholder="Your message" rows={5} required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none" />
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
              {loading ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
