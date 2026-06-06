import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <a href="/" className="text-sm text-muted-foreground hover:underline">← Back</a>
      <h1 className="text-2xl font-medium mt-4 mb-1">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated June 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-medium text-base mb-2">1. Eligibility</h2>
          <p className="text-muted-foreground">You must be at least 18 years old to use ShhChats. By using this service, you confirm you are 18 or older. We reserve the right to terminate accounts of users found to be under 18.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">2. Acceptable use</h2>
          <p className="text-muted-foreground">You agree not to use ShhChats to harass, threaten, or harm others; share explicit, illegal, or abusive content; impersonate another person; solicit personal information from minors; or violate any applicable law.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">3. Anonymous sessions</h2>
          <p className="text-muted-foreground">Guest sessions are anonymous. We do not verify identities. You are solely responsible for what you share in conversations.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">4. Content</h2>
          <p className="text-muted-foreground">We do not claim ownership of messages you send. We may review reported messages to enforce these terms and may delete content that violates them without notice.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">5. Termination</h2>
          <p className="text-muted-foreground">We reserve the right to ban accounts or block sessions that violate these terms at any time, without prior notice.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">6. Disclaimer</h2>
          <p className="text-muted-foreground">ShhChats is provided "as is" without warranties of any kind. We are not liable for any harm arising from your use of this platform or interactions with other users.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">7. Governing law</h2>
          <p className="text-muted-foreground">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>
        </div>
        <div>
          <h2 className="font-medium text-base mb-2">8. Contact</h2>
          <p className="text-muted-foreground">Questions about these terms? Email <a href="mailto:legal@shhchats.in" className="underline">legal@shhchats.in</a></p>
        </div>
      </section>
    </div>
  );
}
