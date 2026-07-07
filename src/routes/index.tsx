import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getHomepageData } from "@/lib/servers.functions";
import { TopBannerStrip, WithSideRails } from "@/components/site/AdSlot";
import { RankingTable } from "@/components/site/RankingTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "L2Index — Trusted Lineage 2 Server Rankings" },
      { name: "description", content: "Vote, rank, and audit Lineage 2 private servers. The only directory that preserves server history — names, domains, and rankings forever." },
      { property: "og:title", content: "L2Index — Trusted Lineage 2 Server Rankings" },
      { property: "og:description", content: "Vote, rank, and audit Lineage 2 private servers. History never gets erased." },
    ],
  }),
  component: Home,
});

function formatLaunch(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24 * 3600 * 1000)));
  return days === 0 ? "Today" : `${days}d`;
}

function Home() {
  const fetchHome = useServerFn(getHomepageData);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["homepage"],
    queryFn: () => fetchHome({ data: undefined as never }),
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: search.trim() || undefined } });
  }

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <TopBannerStrip />

      <WithSideRails>
        {/* Hero */}
        <header className="py-10 px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            Find <span className="text-brand">Trusted</span> Lineage 2 Servers
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-6">
            The only Lineage 2 directory that preserves server history. No resets, no hidden rebrands — just transparent performance data over time.
          </p>

          <form onSubmit={onSearch} className="max-w-2xl mx-auto flex gap-2 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search servers by name, old name, or domain..."
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand"
            />
            <button type="submit" className="bg-brand text-brand-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition">Search</button>
          </form>

          <div className="flex justify-center gap-4 flex-wrap">
            <div className="bg-surface/50 border border-border px-4 py-2 rounded-lg">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-2">Servers</span>
              <span className="text-sm font-mono text-white">{data?.totalServers.toLocaleString() ?? "—"}</span>
            </div>
            <div className="bg-surface/50 border border-border px-4 py-2 rounded-lg">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-2">Season Votes</span>
              <span className="text-sm font-mono text-white">{data?.totalVotes.toLocaleString() ?? "—"}</span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pb-16">
          {/* Sponsored banners */}
          {(data?.banners?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {data!.banners.map((b) => (
                <Link key={b.id} to="/server/$id" params={{ id: b.id }} className="block w-full aspect-[4/1] bg-surface border border-border rounded-xl overflow-hidden relative group">
                  {b.banner_url ? (
                    <img src={b.banner_url} alt={b.current_name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center text-muted-foreground text-sm">{b.current_name}</div>
                  )}
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-brand text-brand-foreground px-2 py-0.5 rounded uppercase">Sponsored</span>
                </Link>
              ))}
            </div>
          )}

          {isLoading && <p className="text-muted-foreground text-sm text-center py-8">Loading rankings…</p>}

          {/* Three-column compact tables */}
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            <RankingTable
              accent="brand"
              title="Current Season"
              yearBadge={year}
              servers={data?.ranked ?? []}
              emptyMessage="No approved servers yet."
            />

            <RankingTable
              accent="gold"
              title="Most Trusted"
              servers={data?.trusted ?? []}
              emptyMessage="Trust builds over time."
              showVotes={false}
            />

            <RankingTable
              accent="success"
              title="Sponsored Servers"
              servers={data?.sponsoredNew ?? []}
              emptyMessage="No sponsored listings."
              showRank={false}
              showVotes={false}
              allSponsored
              viewAllTo="/advertising"
            />
          </div>

          {/* Opening Soon */}
          {(data?.openingSoon?.length ?? 0) > 0 && (
            <div className="mb-6">
              <RankingTable
                accent="accent"
                title="Opening Soon"
                servers={data!.openingSoon}
                showRank={false}
                showVotes={false}
                extraHeader="Launch"
                rowExtra={(s) => (
                  <span className="font-mono text-accent w-12 inline-block text-right">
                    {formatLaunch(s.launch_date)}
                  </span>
                )}
              />
            </div>
          )}

          {/* Why L2Index? — compact */}
          <section className="pt-2">
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold text-white tracking-tight">Why <span className="text-brand">L2Index</span>?</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { t: "Permanent History", d: "Every server name, domain, and ranking is preserved forever." },
                { t: "Verified Trust", d: "Badges earned from real listing age and ranking consistency." },
                { t: "Fair Voting", d: "One vote per IP every 12 hours. No bot farms." },
              ].map((f) => (
                <div key={f.t} className="bg-surface border border-border rounded-lg p-2.5">
                  <h3 className="text-white font-bold text-sm mb-0.5">{f.t}</h3>
                  <p className="text-[11px] text-muted-foreground">{f.d}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </WithSideRails>

      <Footer />
    </div>
  );
}
