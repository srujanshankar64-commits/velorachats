import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — ShhChats" },
      { name: "description", content: "Get in touch with the ShhChats team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("contact_submissions").insert({
      user_id: user?.id ?? null,
      name: name.trim(), email: email.trim(), message: message.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <header className="h-14 px-5 flex items-center">
        <Link to="/" className="p-2 -ml-2 text-[#888]"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></Link>
      </header>
      <div className="max-w-md mx-auto px-6 py-6">
        <h1 className="text-[28px] mb-2">Contact us</h1>
        <p className="text-sm text-[#888] mb-6">Questions, feedback, or reports — we'll get back to you.</p>
        {sent ? (
          <div className="rounded-2xl bg-[#1C1C1E] p-6 text-center">
            <p className="text-sm">Thanks! We received your message.</p>
            <Link to="/" className="mt-4 inline-block text-[#7C3AED] text-sm">Back home</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2.5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required maxLength={120} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required maxLength={254} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" required rows={5} maxLength={4000} className="w-full px-4 py-3 rounded-2xl bg-[#1C1C1E] outline-none text-sm resize-none placeholder:text-[#666]" />
            <button type="submit" disabled={busy} className="w-full h-14 rounded-full bg-[#7C3AED] text-base flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <Loader2 className="h-5 w-5 spin-slow" />} Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
