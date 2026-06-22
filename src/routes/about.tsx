import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About L2Index — Our Mission" },
      { name: "description", content: "L2Index preserves Lineage 2 server history, previous names, and historical rankings. Learn about our mission of transparency and trust." },
      { property: "og:title", content: "About L2Index — Our Mission" },
      { property: "og:description", content: "Preserving Lineage 2 server history with transparency and trust." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">About <span className="text-brand">L2Index</span></h1>
        <p className="text-lg text-muted-foreground mb-12">Trust is the ultimate chronicle.</p>

        <section className="space-y-8 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Our Mission</h2>
            <p>L2Index exists to bring transparency and accountability to the Lineage 2 private server scene. For two decades, players have lost progress, time, and money to servers that disappear, rebrand, or rewrite their own history. We make that history permanent and public.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Preserving Server History</h2>
            <p>Every server name, domain, and ranking we have ever recorded is stored forever. A server that ran for three years under one name and rebranded to escape its reputation will still appear in our records under both names. History is not negotiable here.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Historical Rankings</h2>
            <p>We archive seasonal rankings year after year. You can see which servers held the top spot in 2022, 2023, 2024 — not just who's marketing hardest this week. Longevity and consistency earn trust badges visible across the platform.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Transparency First</h2>
            <p>Votes are rate-limited per IP. Name changes are logged. Domain conflicts are flagged. Server identity chains are auditable. We don't hide our rules — we publish them and enforce them uniformly.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Built for Players</h2>
            <p>L2Index is built by people who have played, lost, and rebuilt characters across countless Lineage 2 servers. We know what a trustworthy directory should look like, because we wished one existed.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
