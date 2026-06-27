import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/advertising")({
  head: () => ({
    meta: [
      { title: "Advertise on L2Index — Premium Banner Slots" },
      { name: "description", content: "Reach thousands of Lineage 2 players. Premium banner placements on L2Index — homepage, server pages, and side rails." },
      { property: "og:title", content: "Advertise on L2Index" },
      { property: "og:description", content: "Premium banner placements across the most trusted Lineage 2 directory." },
    ],
  }),
  component: AdvertisingPage,
});

function AdvertisingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Advertise on <span className="text-brand">L2Index</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Place your server in front of the Lineage 2 community. Premium banner slots on the homepage, server pages, and side rails.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { t: "Top Strip", d: "5 horizontal banners above the hero. Maximum visibility on every visit." },
            { t: "Side Rails", d: "Large vertical banners flanking content across homepage and server pages." },
            { t: "Sponsored Cards", d: "Featured placement inside Current Season and New Servers tables." },
          ].map((s) => (
            <div key={s.t} className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-white font-bold mb-1">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground mb-4">Interested in a slot? Get in touch and we'll send you the rate card.</p>
          <Link to="/contact" className="inline-block bg-brand text-brand-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Contact Us
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
