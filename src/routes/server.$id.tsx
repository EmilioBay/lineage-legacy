import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getServerDetail } from "@/lib/servers.functions";
import { castVote, getVoteCooldown } from "@/lib/voting.functions";
import { getFingerprint } from "@/lib/fingerprint";
import { getTrustBadge, badgeClasses } from "@/lib/trust";

export const Route = createFileRoute("/server/$id")({
  head: ({ params }) => ({ meta: [{ title: `Server — L2Index` }, { name: "description", content: `Details, ranking history, and trust audit for Lineage 2 server.` }] }),
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

  const { server, nameHistory, domainHistory, yearly, stats, currentSeasonVotes } = data;
  const trust = getTrustBadge(server.first_seen_at);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Banner */}
      {server.banner_url && (
        <div className="w-full h-48 md:h-64 overflow-hidden border-b border-border">
          <img src={server.banner_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-start gap-5">
            <div className="size-20 rounded-xl bg-surface border border-border overflow-hidden grid place-items-center shrink-0">
              {server.logo_url ? <img src={server.logo_url} alt={server.current_name} className="size-full object-cover" /> : <span className="font-mono text-muted-foreground">{server.current_name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{server.current_name}</h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeClasses(trust.badge)}`}>{trust.label}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2 flex-wrap">
                <span className="font-mono bg-surface px-2 py-0.5 rounded">{server.chronicle}</span>
                <span className="font-mono bg-surface px-2 py-0.5 rounded">x{server.rates.replace(/^x/i, "")}</span>
                {server.country && <span>· {server.country}</span>}
              </div>
              <div className="flex gap-3 mt-3 text-sm">
                <a href={server.website_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{server.domain}</a>
                {server.discord_url && <a href={server.discord_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">Discord</a>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending || cooldown?.can_vote === false} className="bg-brand text-brand-foreground px-6 py-3 rounded-lg font-bold hover:opacity-90 disabled:opacity-50">
                {mutation.isPending ? "..." : "VOTE"}
              </button>
              {cooldown?.can_vote === false && cooldown.next_vote_at && (
                <p className="text-[11px] text-muted-foreground">Next vote: {new Date(cooldown.next_vote_at).toLocaleString()}</p>
              )}
              {cooldown?.can_vote === true && (
                <p className="text-[11px] text-muted-foreground">You can vote now</p>
              )}
            </div>

          <section>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">About</h2>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">{server.description}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Ranking History</h2>
            <div className="bg-surface border border-border rounded-xl p-4 h-72">
              {stats.length === 0 ? (
                <div className="h-full grid place-items-center text-muted-foreground text-sm">Not enough data yet — votes will appear on the graph as they accumulate.</div>
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
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Trust & History</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">First seen</dt><dd className="text-white">{new Date(server.first_seen_at).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Years listed</dt><dd className="text-white">{trust.years}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Season votes</dt><dd className="text-white font-mono">{currentSeasonVotes.toLocaleString()}</dd></div>
            </dl>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Name History</h3>
            {nameHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No name changes recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {nameHistory.map((n) => (
                  <li key={n.id} className="text-foreground">
                    <span className="line-through text-muted-foreground">{n.old_name}</span> → <span className="text-white">{n.new_name}</span>
                    <div className="text-[10px] text-muted-foreground">{new Date(n.changed_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Domain History</h3>
            {domainHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No domain changes recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {domainHistory.map((d) => (
                  <li key={d.id} className="text-foreground">
                    <span className="line-through text-muted-foreground">{d.old_domain}</span> → <span className="text-white">{d.new_domain}</span>
                    <div className="text-[10px] text-muted-foreground">{new Date(d.changed_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Yearly Ranks</h3>
            {yearly.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No closed seasons yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {yearly.map((y) => (
                  <li key={y.id} className="flex justify-between">
                    <span className="font-mono text-muted-foreground">{y.year}</span>
                    <span className="text-white">#{y.rank} <span className="text-muted-foreground text-xs">({y.total_votes.toLocaleString()} votes)</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
