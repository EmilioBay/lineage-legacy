import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ServerRow } from "@/components/site/ServerRow";
import { getHomepageData } from "@/lib/servers.functions";
import { castVote } from "@/lib/voting.functions";
import { getFingerprint } from "@/lib/fingerprint";
import { getTrustBadge, badgeClasses } from "@/lib/trust";

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

function Home() {
  const fetchHome = useServerFn(getHomepageData);
  const vote = useServerFn(castVote);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["homepage"],
    queryFn: () => fetchHome({ data: undefined as never }),
  });

  const mutation = useMutation({
    mutationFn: async (server_id: string) => vote({ data: { server_id, fingerprint: getFingerprint() } }),
    onSuccess: () => { toast.success("Vote counted. Thanks for supporting the server."); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: search.trim() || undefined } });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <header className="py-16 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
          Find Trusted <span className="text-brand">Lineage 2</span> Servers
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          The only Lineage 2 directory that preserves server history. No resets, no hidden rebrands — just transparent performance data over time.
        </p>

        <form onSubmit={onSearch} className="max-w-2xl mx-auto flex gap-2 mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers by name, old name, or domain..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand"
          />
          <button type="submit" className="bg-brand text-brand-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition">Search</button>
        </form>

        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/browse" className="bg-surface border border-border px-5 py-2 rounded-lg text-sm font-medium hover:bg-surface-hover transition">Browse Servers</Link>
          <Link to="/add-server" className="bg-white/5 border border-white/10 px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition">Add Server</Link>
        </div>

        <div className="flex justify-center gap-4 mt-10">
          <div className="bg-surface/50 border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Servers</p>
            <p className="text-xl font-mono text-white">{data?.totalServers.toLocaleString() ?? "—"}</p>
          </div>
          <div className="bg-surface/50 border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Votes this Season</p>
            <p className="text-xl font-mono text-white">{data?.totalVotes.toLocaleString() ?? "—"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24">
        {/* Banner zone */}
        {(data?.banners?.length ?? 0) > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Current Season Rankings */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Current Season Rankings
                <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded border border-brand/20 uppercase font-mono">{new Date().getFullYear()}</span>
              </h2>
              <Link to="/browse" className="text-sm text-brand hover:underline">View All</Link>
            </div>

            {isLoading && <p className="text-muted-foreground text-sm">Loading rankings…</p>}
            {!isLoading && data?.ranked.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">No approved servers yet.</p>
                <Link to="/add-server" className="inline-block mt-4 bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold">Be the first to add one</Link>
              </div>
            )}

            {data?.ranked.map((s, i) => (
              <ServerRow
                key={s.id}
                rank={i + 1}
                server={s}
                onVote={(id) => mutation.mutate(id)}
                voting={mutation.isPending && mutation.variables === s.id}
              />
            ))}
          </div>

          {/* Right: Most Trusted + New */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Most Trusted</h2>
              <div className="bg-surface border border-border rounded-xl divide-y divide-border">
                {(data?.trusted ?? []).length === 0 && (
                  <p className="p-4 text-xs text-muted-foreground">Trust builds over time. No veterans listed yet.</p>
                )}
                {data?.trusted.map((s) => {
                  const t = getTrustBadge({ firstSeenAt: s.first_seen_at, topRankYears: s.top_rank_years });
                  return (
                    <Link key={s.id} to="/server/$id" params={{ id: s.id }} className="p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`size-10 rounded-full grid place-items-center text-[10px] font-bold border ${badgeClasses(t.badge)}`}>{t.years || "<1"}Y</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-brand transition-colors truncate">{s.current_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Listed {new Date(s.first_seen_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                            {t.topRankYears > 0 && <span className="text-accent"> · {t.topRankYears}× top 10</span>}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-semibold ${t.badge === "legendary" ? "text-accent" : "text-muted-foreground"}`}>{t.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">New Servers</h2>
              <div className="space-y-3">
                {data?.sponsoredNew.map((s) => (
                  <Link key={s.id} to="/server/$id" params={{ id: s.id }} className="block bg-surface border border-border rounded-xl p-4 hover:border-brand/30 transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-bold bg-brand text-brand-foreground px-2 py-0.5 rounded uppercase">Sponsored</span>
                      <span className="text-[10px] font-mono text-accent">x{s.rates.replace(/^x/i, "")}</span>
                    </div>
                    <h4 className="text-white font-bold">{s.current_name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{s.chronicle} · {s.description.slice(0, 60)}</p>
                  </Link>
                ))}
                {data?.organicNew.map((s) => (
                  <Link key={s.id} to="/server/$id" params={{ id: s.id }} className="bg-surface/50 border border-border rounded-xl p-3 flex items-center gap-3 hover:bg-surface transition">
                    <div className="size-10 bg-background rounded border border-border overflow-hidden grid place-items-center">
                      {s.logo_url ? <img src={s.logo_url} alt="" className="size-full object-cover" /> : <span className="text-[10px] text-muted-foreground">{s.current_name.slice(0,2)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{s.current_name}</p>
                      <p className="text-[9px] text-muted-foreground">{s.chronicle} · Added {new Date(s.first_seen_at).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
                {data && data.sponsoredNew.length === 0 && data.organicNew.length === 0 && (
                  <p className="text-xs text-muted-foreground">No new servers yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
