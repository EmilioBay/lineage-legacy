import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Globe, MessageCircle, Calendar, Trophy, History, ShieldCheck, Clock, TrendingUp, ChevronRight, Users, CheckCircle2, Hash, Award, UserCheck } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShieldBadge } from "@/components/site/ShieldBadge";
import { WithSideRails } from "@/components/site/AdSlot";
import { getServerDetail } from "@/lib/servers.functions";
import { castVote, getVoteCooldown } from "@/lib/voting.functions";
import { createOwnershipClaim, getOwnershipClaimStatus } from "@/lib/advertising.functions";
import { getFingerprint } from "@/lib/fingerprint";
import { getTrustBadge } from "@/lib/trust";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/server/$id")({
  head: () => ({ meta: [{ title: `Server — L2Index` }, { name: "description", content: `Trust audit, ranking history, and identity chain for this Lineage 2 server on L2Index.` }] }),
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

function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 relative overflow-hidden">
      {accent && <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />}
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="text-lg font-extrabold text-white mt-1 leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const rx = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = rx.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={`l${i++}`} href={m[0]} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">{m[0]}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function formatDescription(text: string) {
  const paragraphs = text.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((p, idx) => {
    const lines = p.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((l) => /^[-•*]\s+/.test(l));
    if (isList) {
      return (
        <ul key={idx} className="list-disc list-inside space-y-1.5 text-foreground pl-1">
          {lines.map((l, i) => <li key={i}>{linkify(l.replace(/^[-•*]\s+/, ""))}</li>)}
        </ul>
      );
    }
    return <p key={idx} className="text-foreground leading-relaxed">{linkify(p)}</p>;
  });
}

const COUNTRY_FLAGS: Record<string, string> = {
  brazil: "🇧🇷", russia: "🇷🇺", "united states": "🇺🇸", usa: "🇺🇸", spain: "🇪🇸", france: "🇫🇷",
  germany: "🇩🇪", italy: "🇮🇹", poland: "🇵🇱", portugal: "🇵🇹", turkey: "🇹🇷", greece: "🇬🇷",
  ukraine: "🇺🇦", romania: "🇷🇴", argentina: "🇦🇷", mexico: "🇲🇽", chile: "🇨🇱", peru: "🇵🇪",
  colombia: "🇨🇴", "united kingdom": "🇬🇧", uk: "🇬🇧", netherlands: "🇳🇱", international: "🌐",
  bulgaria: "🇧🇬", hungary: "🇭🇺", czechia: "🇨🇿", "czech republic": "🇨🇿", slovakia: "🇸🇰",
  serbia: "🇷🇸", croatia: "🇭🇷", lithuania: "🇱🇹", latvia: "🇱🇻", estonia: "🇪🇪",
  belarus: "🇧🇾", kazakhstan: "🇰🇿",
};
function countryFlag(country?: string | null) {
  if (!country) return null;
  const key = country.trim().toLowerCase();
  return COUNTRY_FLAGS[key] ?? "🌐";
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

  const [justVoted, setJustVoted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [userId, setUserId] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const claimStatusFn = useServerFn(getOwnershipClaimStatus);
  const createClaimFn = useServerFn(createOwnershipClaim);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: claimStatus, refetch: refetchClaim } = useQuery({
    queryKey: ["ownership-claim", id, userId],
    queryFn: () => claimStatusFn({ data: { server_id: id } }),
    enabled: !!userId,
  });

  const claimMut = useMutation({
    mutationFn: (message: string) => createClaimFn({ data: { server_id: id, message } }),
    onSuccess: () => { toast.success("Ownership claim submitted"); setClaimOpen(false); setClaimMsg(""); refetchClaim(); },
    onError: (e: Error) => toast.error(e.message),
  });


  const mutation = useMutation({
    mutationFn: async () => vote({ data: { server_id: id, fingerprint: getFingerprint() } }),
    onSuccess: () => {
      toast.success("Your vote has been counted.");
      setJustVoted(true);
      refetch(); refetchCooldown();
      setTimeout(() => setJustVoted(false), 8000);
    },
    onError: (e: Error) => { toast.error(e.message); refetchCooldown(); },
  });

  useEffect(() => {
    if (cooldown?.can_vote === false) {
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }
  }, [cooldown?.can_vote]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto p-12 text-muted-foreground">Loading server…</div>
      </div>
    );
  }

  const { server, nameHistory, domainHistory, yearly, stats, currentSeasonVotes, lifetimeVotes, currentRank, similar } = data;
  const topRankYears = yearly.filter((y) => y.rank <= 10).length;
  const trust = getTrustBadge({ firstSeenAt: server.first_seen_at, topRankYears });
  const firstSeen = new Date(server.first_seen_at);
  const serialLabel = server.serial_id ? `#${String(server.serial_id).padStart(6, "0")}` : "—";

  function countdown(target: string) {
    const ms = Math.max(0, new Date(target).getTime() - now);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const canVote = cooldown?.can_vote !== false;

  const VotePanel = () => (
    <div className="bg-gradient-to-b from-brand/20 via-brand/5 to-surface border border-brand/30 rounded-2xl p-4 shadow-xl">
      <div className="text-[9px] font-bold text-brand uppercase tracking-widest text-center">Season Votes</div>
      <div className="text-3xl font-extrabold text-white font-mono mt-0.5 text-center tabular-nums">{currentSeasonVotes.toLocaleString()}</div>
      {currentRank && (
        <div className="text-[10px] text-muted-foreground text-center">
          Ranked <span className="text-white font-semibold">#{currentRank}</span>
        </div>
      )}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canVote}
        className="mt-3 w-full bg-brand text-brand-foreground px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
      >
        {mutation.isPending ? "Voting…" : canVote ? "VOTE FOR THIS SERVER" : "VOTE ON COOLDOWN"}
      </button>

      {justVoted && (
        <div className="mt-2 flex items-center gap-1.5 bg-green-500/10 border border-green-500/40 text-green-400 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold">
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span>Vote counted.</span>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1 text-center">
        <Clock className="size-3 shrink-0" />
        {cooldown?.can_vote === false && cooldown.next_vote_at ? (
          <span>Next in <span className="font-mono text-white tabular-nums">{countdown(cooldown.next_vote_at)}</span></span>
        ) : (
          <span>1 vote / 12h / IP</span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2">
        <a href={server.website_url} target="_blank" rel="noreferrer"
           className="inline-flex items-center justify-center gap-1.5 bg-surface hover:bg-surface/70 border border-border text-white px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors">
          <Globe className="size-3" /> Website
        </a>
        {server.discord_url ? (
          <a href={server.discord_url} target="_blank" rel="noreferrer"
             className="inline-flex items-center justify-center gap-1.5 bg-surface hover:bg-surface/70 border border-border text-white px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors">
            <MessageCircle className="size-3" /> Discord
          </a>
        ) : <div />}
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1"><Hash className="size-3" /> ID</span>
        <span className="font-mono text-white/90">{serialLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumbs */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 text-xs text-muted-foreground flex items-center gap-1.5">
        <Link to="/" className="hover:text-white transition-colors">Rankings</Link>
        <ChevronRight className="size-3" />
        <span className="text-white">{server.current_name}</span>
      </div>

      {/* Hero */}
      <section className="relative mt-3 border-y border-border overflow-hidden">
        {server.banner_url ? (
          <div className="absolute inset-0">
            <img src={server.banner_url} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-background to-background" />
        )}
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="size-28 md:size-32 rounded-2xl bg-surface border border-border overflow-hidden grid place-items-center shrink-0 shadow-2xl">
              {server.logo_url
                ? <img src={server.logo_url} alt={server.current_name} className="size-full object-cover" />
                : <span className="font-mono text-3xl text-muted-foreground">{server.current_name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{server.current_name}</h1>
                <ShieldBadge firstSeenAt={server.first_seen_at} topRankYears={topRankYears} size="lg" showLabel />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 flex-wrap">
                <span className="font-mono bg-surface/80 backdrop-blur px-2.5 py-1 rounded border border-border">{server.chronicle}</span>
                <span className="font-mono bg-surface/80 backdrop-blur px-2.5 py-1 rounded border border-border">x{String(server.rates).replace(/^x/i, "")}</span>
                {server.country && <span className="bg-surface/80 backdrop-blur px-2.5 py-1 rounded border border-border inline-flex items-center gap-1.5"><span className="text-base leading-none">{countryFlag(server.country)}</span>{server.country}</span>}
                {server.server_type && <span className="bg-surface/80 backdrop-blur px-2.5 py-1 rounded border border-border">{server.server_type}</span>}
                <span className="bg-surface/80 backdrop-blur px-2.5 py-1 rounded border border-border font-mono">{server.domain}</span>
              </div>
              <p className="text-base md:text-lg text-foreground/90 mt-4 max-w-3xl line-clamp-2">
                {server.description?.split(/\n/)[0]}
              </p>
            </div>
          </div>
        </div>
      </section>

      <WithSideRails>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">

        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Main column */}
          <div className="min-w-0 space-y-10">

            {/* Mobile vote panel */}
            <div className="lg:hidden">
              <VotePanel />
            </div>

            {/* Trust stat grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="First Listed"
                value={firstSeen.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                sub={firstSeen.toLocaleDateString()}
                accent="bg-brand"
              />
              <StatCard
                label="Years Listed"
                value={trust.years}
                sub={`${topRankYears} top-10 finishes`}
                accent="bg-accent"
              />
              <StatCard
                label="Season Rank"
                value={currentRank ? `#${currentRank}` : "—"}
                sub={`Season ${new Date().getFullYear()}`}
                accent="bg-brand"
              />
              <StatCard
                label="Season Votes"
                value={currentSeasonVotes.toLocaleString()}
                sub="Current year"
                accent="bg-brand"
              />
              <StatCard
                label="Lifetime Votes"
                value={lifetimeVotes.toLocaleString()}
                sub="Since first listed"
                accent="bg-accent"
              />
              <StatCard
                label="Trust Level"
                value={<span className="inline-flex items-center gap-1.5"><Award className="size-5" /> {trust.label}</span>}
                sub={`${trust.years} yr / ${topRankYears} top-10`}
                accent="bg-accent"
              />
              <StatCard
                label="Server ID"
                value={<span className="font-mono">{serialLabel}</span>}
                sub="Permanent identifier"
                accent="bg-brand"
              />
              <StatCard
                label="Chronicle"
                value={<span className="font-mono">{server.chronicle}</span>}
                sub={`x${String(server.rates).replace(/^x/i, "")} rates`}
                accent="bg-accent"
              />
            </section>


            {/* About */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">About</h2>
              </div>
              <div className="bg-surface border border-border rounded-xl p-6 space-y-4 text-sm">
                {formatDescription(server.description)}
                {server.launch_date && (
                  <div className="mt-2 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                    Server launch date: <span className="text-white font-medium">{new Date(server.launch_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Trust & History */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="size-5 text-brand" />
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">Trust &amp; History</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Name Timeline</h3>
                  </div>
                  <ol className="relative border-l border-border/60 ml-2 space-y-4">
                    <li className="pl-4 relative">
                      <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-brand ring-4 ring-brand/20" />
                      <div className="text-sm text-white font-semibold">{server.current_name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Current · since {new Date(nameHistory[0]?.changed_at ?? server.first_seen_at).toLocaleDateString()}</div>
                    </li>
                    {nameHistory.map((n, i) => (
                      <li key={n.id} className="pl-4 relative">
                        <span className="absolute -left-[6px] top-1.5 size-2.5 rounded-full bg-muted-foreground/50" />
                        <div className="text-sm text-foreground/80 line-through">{n.old_name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Renamed → <span className="text-white/90 no-underline">{n.new_name}</span> · {new Date(n.changed_at).toLocaleDateString()}
                          {i === nameHistory.length - 1 && <span className="ml-1">(original)</span>}
                        </div>
                      </li>
                    ))}
                    {nameHistory.length === 0 && (
                      <li className="pl-4 text-xs text-muted-foreground italic">Never renamed — always operated under this name.</li>
                    )}
                  </ol>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Domain Timeline</h3>
                  </div>
                  <ol className="relative border-l border-border/60 ml-2 space-y-4">
                    <li className="pl-4 relative">
                      <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-brand ring-4 ring-brand/20" />
                      <div className="text-sm text-white font-mono">{server.domain}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Current domain</div>
                    </li>
                    {domainHistory.map((d, i) => (
                      <li key={d.id} className="pl-4 relative">
                        <span className="absolute -left-[6px] top-1.5 size-2.5 rounded-full bg-muted-foreground/50" />
                        <div className="text-sm text-foreground/80 line-through font-mono text-xs">{d.old_domain}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Moved → <span className="text-white/90 font-mono">{d.new_domain}</span> · {new Date(d.changed_at).toLocaleDateString()}
                          {i === domainHistory.length - 1 && <span className="ml-1">(original)</span>}
                        </div>
                      </li>
                    ))}
                    {domainHistory.length === 0 && (
                      <li className="pl-4 text-xs text-muted-foreground italic">Never migrated — always hosted at this domain.</li>
                    )}
                  </ol>
                </div>
              </div>
            </section>

            {/* Yearly rankings */}
            <section>
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

            {/* Vote trend */}
            <section>
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

            {/* Similar servers */}
            {similar && similar.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest">You May Also Like</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {similar.map((s) => (
                    <Link
                      key={s.id}
                      to="/server/$id"
                      params={{ id: s.id }}
                      className="group flex items-center gap-2 bg-surface border border-border hover:border-brand/50 hover:bg-surface/70 rounded-lg p-2 transition-colors"
                    >
                      <div className="size-8 rounded bg-background border border-border overflow-hidden grid place-items-center shrink-0">
                        {s.logo_url
                          ? <img src={s.logo_url} alt="" className="size-full object-cover" />
                          : <span className="font-mono text-[9px] text-muted-foreground">{s.current_name.slice(0,2).toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-white truncate group-hover:text-brand transition-colors">{s.current_name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {s.chronicle} · x{String(s.rates).replace(/^x/i, "")}
                          {s.country ? ` · ${s.country}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px] font-bold text-white leading-none">{s.votes.toLocaleString()}</div>
                        <div className="text-[8px] uppercase tracking-widest text-muted-foreground mt-0.5">votes</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <VotePanel />
            </div>
          </aside>
        </div>
      </main>
      </WithSideRails>

      <Footer />
    </div>
  );
}
