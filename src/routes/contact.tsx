import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact L2Index — Get in Touch" },
      { name: "description", content: "Contact the L2Index team. Reach us by email, Discord, or the contact form for questions, server claims, and partnerships." },
      { property: "og:title", content: "Contact L2Index" },
      { property: "og:description", content: "Reach the L2Index team by email, Discord, or contact form." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success("Thanks — we'll be in touch shortly.");
      setName(""); setEmail(""); setMessage("");
      setSending(false);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">Contact <span className="text-brand">Us</span></h1>
        <p className="text-lg text-muted-foreground mb-12">Questions, server claims, partnerships — we read every message.</p>

        <div className="grid md:grid-cols-2 gap-10">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} className="mt-1 w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand resize-y" />
            </div>
            <button disabled={sending} className="bg-brand text-brand-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>

          <aside className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Email</p>
              <a href="mailto:hello@l2index.com" className="text-white font-mono hover:text-brand transition">hello@l2index.com</a>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Discord</p>
              <a href="https://discord.gg/l2index" target="_blank" rel="noopener noreferrer" className="text-white font-mono hover:text-brand transition">discord.gg/l2index</a>
              <p className="text-xs text-muted-foreground mt-2">Join our community server for real-time discussion and support.</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Response time</p>
              <p className="text-sm text-foreground/90">Within 48 hours on business days.</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
