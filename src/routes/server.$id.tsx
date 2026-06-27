import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Globe, MessageCircle, Calendar, Trophy, History, ShieldCheck, Clock, TrendingUp } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShieldBadge } from "@/components/site/ShieldBadge";
import { WithSideRails } from "@/components/site/AdSlot";
import { getServerDetail } from "@/lib/servers.functions";
import { castVote, getVoteCooldown } from "@/lib/voting.functions";
import { getFingerprint } from "@/lib/fingerprint";
import { getTrustBadge } from "@/lib/trust";

export const Route = createFileRoute("/server/$id")({
  head: ({ params }) => ({ meta: [{ title: `Server — L2Index` }, { name: "description", content: `Trust audit, ranking history, and identity chain for this Lineage 2 server on L2Index.` }] }),
  component: ServerPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button onClick={reset} className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Server not found</h1>
        <Link to="/" className="text-brand mt-4 inline-block">Back to rankings</Link>
      </div>
    </div>
  ),
});

function StatBox({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-extrabold text-white mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ServerPage() {
  const { id } = Route.useParams();
  const fetch = useServerFn(getServerDetail);
  const vote = useServerFn(castVote);
  const cooldownFn = useServerFn(getVoteCooldown);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["server", id],
    queryFn: async () => {
      const r = await fetch({ data: { id } });
      if (!r) throw notFound();
      return r;
    },
  });

  const { data: cooldown, refetch: refetchCooldown } = useQuery({
    queryKey: ["vote-cooldown", id],
    queryFn: () => cooldownFn({ data: { server_id: id } }),
    refetchInterval: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async () => vote({ data: { server_id: id, fingerprint: getFingerprint() } }),
    onSuccess: () => { toast.success("Vote counted."); refetch(); refetchCooldown(); },
    onError: (e: Error) => { toast.error(e.message); refetchCooldown(); },
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto p-12 text-muted-foreground">Loading server…</div>
      </div>
    );
  }

  const { server, nameHistory, domainHistory, yearly, stats, currentSeasonVotes, currentRank } = data as typeof data & { currentRank?: number | null };
  const topRankYears = yearly.filter((y) => y.rank <= 10).length;
  const trust = getTrustBadge({ firstSeenAt: server.first_seen_at, topRankYears });
  const firstSeen = new Date(server.first_seen_at);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Banner */}
      {server.banner_url && (
        <div className="w-full h-40 md:h-56 overflow-hidden border-b border-border relative">
          <img src={server.banner_url} alt="" className="w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      <WithSideRails>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">

        {/* Identity header */}
        <section className="flex flex-col md:flex-row items-start gap-5 md:gap-6">
          <div className="size-24 md:size-28 rounded-2xl bg-surface border border-border overflow-hidden grid place-items-center shrink-0 shadow-lg">
            {server.logo_url
              ? <img src={server.logo_url} alt={server.current_name} className="size-full object-cover" />
              : <span className="font-mono text-2xl text-muted-foreground">{server.current_name.slice(0,2).toUpperCase()}</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{server.current_name}</h1>
              <ShieldBadge firstSeenAt={server.first_seen_at} topRankYears={topRankYears} size="lg" showLabel />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 flex-wrap">
              <span className="font-mono bg-surface px-2 py-0.5 rounded border border-border">{server.chronicle}</span>
              <span className="font-mono bg-surface px-2 py-0.5 rounded border border-border">x{String(server.rates).replace(/^x/i, "")}</span>
              {server.country && <span className="bg-surface px-2 py-0.5 rounded border border-border">{server.country}</span>}
              {server.server_type && <span className="bg-surface px-2 py-0.5 rounded border border-border">{server.server_type}</span>}
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <a href={server.website_url} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-2 bg-surface hover:bg-surface/70 border border-border text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Globe className="size-4" /> Website
              </a>
              {server.discord_url && (
                <a href={server.discord_url} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 bg-surface hover:bg-surface/70 border border-border text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <MessageCircle className="size-4" /> Discord
                </a>
              )}
            </div>
          </div>

          {/* Vote panel */}
          <div className="w-full md:w-auto md:min-w-[220px] bg-gradient-to-b from-brand/15 to-surface border border-brand/30 rounded-2xl p-5 text-center">
            <div className="text-[10px] font-bold text-brand uppercase tracking-widest">Season Votes</div>
            <div className="text-4xl font-extrabold text-white font-mono mt-1">{currentSeasonVotes.toLocaleString()}</div>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || cooldown?.can_vote === false}
              className="mt-3 w-full bg-brand text-brand-foreground px-6 py-3 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {mutation.isPending ? "Voting…" : "VOTE FOR THIS SERVER"}
            </button>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Clock className="size-3" />
              {cooldown?.can_vote === false && cooldown.next_vote_at
                ? <>Next vote {new Date(cooldown.next_vote_at).toLocaleString()}</>
                : <>You can vote now · 1 vote / 12h / IP</>}
            </div>
          </div>
        </section>

        {/* Trust stat grid */}
        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="First Listed"
            value={firstSeen.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            sub={firstSeen.toLocaleDateString()}
          />
          <StatBox
            label="Years Listed"
            value={trust.years}
            sub={`${trust.label} tier`}
          />
          <StatBox
            label="Current Rank"
            value={currentRank ? `#${currentRank}` : "—"}
            sub={`Season ${new Date().getFullYear()}`}
          />
          <StatBox
            label="Top-10 Years"
            value={topRankYears}
            sub="Historical finishes"
          />
        </section>

        {/* Trust & History headline */}
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="size-5 text-brand" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Trust &amp; History</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Name history */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <History className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Previous Names</h3>
              </div>
              {nameHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No name changes — always operated as <span className="text-white not-italic font-medium">{server.current_name}</span>.</p>
              ) : (
                <ul className="space-y-2.5 text-sm">
                  {nameHistory.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="line-through text-muted-foreground">{n.old_name}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="text-white font-medium">{n.new_name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">{new Date(n.changed_at).toLocaleDateString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Domain history */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="size-4 text-muted-foreground" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Previous Domains</h3>
              </div>
              {domainHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No domain changes — always hosted at <span className="text-white not-italic font-medium">{server.domain}</span>.</p>
              ) : (
                <ul className="space-y-2.5 text-sm">
                  {domainHistory.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="line-through text-muted-foreground font-mono text-xs">{d.old_domain}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="text-white font-medium font-mono text-xs">{d.new_domain}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">{new Date(d.changed_at).toLocaleDateString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Yearly rankings */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="size-5 text-accent" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Yearly Rankings</h2>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {yearly.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground italic">No closed seasons yet — this server's first full year is in progress.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-background/50">
                  <tr className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    <th className="text-left px-4 py-2 font-bold">Year</th>
                    <th className="text-left px-4 py-2 font-bold">Final Rank</th>
                    <th className="text-right px-4 py-2 font-bold">Total Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.map((y) => (
                    <tr key={y.id} className="border-t border-border/60">
                      <td className="px-4 py-2.5 font-mono text-white">{y.year}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-bold ${y.rank <= 3 ? "text-accent" : y.rank <= 10 ? "text-white" : "text-muted-foreground"}`}>#{y.rank}</span>
                        {y.rank <= 10 && <span className="ml-2 text-[10px] uppercase tracking-widest text-accent">Top 10</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{y.total_votes.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* About */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">About</h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{server.description}</p>
            {server.launch_date && (
              <div className="mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                Server launch date: <span className="text-white font-medium">{new Date(server.launch_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </section>

        {/* Vote trend */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-5 text-brand" />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Vote Trend</h2>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 h-64">
            {stats.length === 0 ? (
              <div className="h-full grid place-items-center text-muted-foreground text-sm">Not enough data yet — votes will appear as they accumulate.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#0f1115", border: "1px solid #1f2937", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="votes" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
