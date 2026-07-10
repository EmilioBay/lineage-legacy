import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, X, RotateCcw } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShieldBadge } from "@/components/site/ShieldBadge";
import { listServers } from "@/lib/servers.functions";
import { CHRONICLES } from "@/lib/l2-constants";
import { getTrustBadge, type TrustBadge } from "@/lib/trust";
import { cn } from "@/lib/utils";

const REGIONS = ["Europe", "Americas", "Asia", "Other"] as const;
const COUNTRY_REGION: Record<string, (typeof REGIONS)[number]> = {
  Argentina: "Americas", Brazil: "Americas", Canada: "Americas", Chile: "Americas",
  Colombia: "Americas", Mexico: "Americas", Peru: "Americas", "United States": "Americas",
  Uruguay: "Americas", Venezuela: "Americas",
  China: "Asia", India: "Asia", Indonesia: "Asia", Japan: "Asia", Kazakhstan: "Asia",
  Philippines: "Asia", Singapore: "Asia", "South Korea": "Asia", Thailand: "Asia", Vietnam: "Asia",
  Australia: "Other", Egypt: "Other", Israel: "Other", "United Arab Emirates": "Other", Other: "Other",
};
function regionOf(country?: string | null): (typeof REGIONS)[number] {
  if (!country) return "Other";
  return COUNTRY_REGION[country] ?? "Europe";
}

const STATUSES = ["Live", "Opening Soon"] as const;
const TRUST_BADGES: TrustBadge[] = ["new", "established", "veteran", "legendary"];
const SORTS = [
  { id: "votes", label: "Most Votes" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name (A–Z)" },
  { id: "rate_low", label: "Rate: Low → High" },
  { id: "rate_high", label: "Rate: High → Low" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/browse")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Browse All Servers — L2Index" },
      { name: "description", content: "Browse, filter and search every Lineage 2 server tracked by L2Index — by chronicle, rates, region, trust and more." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const list = useServerFn(listServers);

  const [q, setQ] = useState(search.q ?? "");
  const [chronicle, setChronicle] = useState<string>("");
  const [rateBucket, setRateBucket] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [trust, setTrust] = useState<string>("");
  const [sort, setSort] = useState<SortId>("votes");

  const { data, isLoading } = useQuery({
    queryKey: ["browse", search.q ?? ""],
    queryFn: () => list({ data: { q: search.q } }),
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    const rows = (data ?? []).map((s) => {
      const rateNum = parseInt(String(s.rates).replace(/[^0-9]/g, ""), 10) || 0;
      const launched = !s.launch_date || new Date(s.launch_date).getTime() <= now;
      const badge = getTrustBadge({ firstSeenAt: s.first_seen_at, topRankYears: s.top_rank_years ?? 0 });
      return {
        ...s,
        _rate: rateNum,
        _region: regionOf(s.country),
        _status: launched ? "Live" : "Opening Soon",
        _badge: badge.badge,
      };
    });

    return rows
      .filter((s) => (chronicle ? s.chronicle === chronicle : true))
      .filter((s) => {
        if (!rateBucket) return true;
        if (rateBucket === "low") return s._rate <= 5;
        if (rateBucket === "mid") return s._rate > 5 && s._rate <= 50;
        if (rateBucket === "high") return s._rate > 50 && s._rate <= 500;
        if (rateBucket === "extreme") return s._rate > 500;
        return true;
      })
      .filter((s) => (region ? s._region === region : true))
      .filter((s) => (status ? s._status === status : true))
      .filter((s) => (trust ? s._badge === trust : true))
      .sort((a, b) => {
        switch (sort) {
          case "newest": return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
          case "oldest": return new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime();
          case "name": return a.current_name.localeCompare(b.current_name);
          case "rate_low": return a._rate - b._rate;
          case "rate_high": return b._rate - a._rate;
          case "votes":
          default: return b.votes - a.votes;
        }
      });
  }, [data, chronicle, rateBucket, region, status, trust, sort]);

  const chronicleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of data ?? []) counts[s.chronicle] = (counts[s.chronicle] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: q.trim() || undefined } });
  }

  function resetFilters() {
    setQ("");
    setChronicle("");
    setRateBucket("");
    setRegion("");
    setStatus("");
    setTrust("");
    setSort("votes");
    navigate({ to: "/browse", search: {} });
  }

  const hasActiveFilters =
    !!q || !!chronicle || !!rateBucket || !!region || !!status || !!trust || sort !== "votes" || !!search.q;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Browse Servers</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Filter and search every approved Lineage 2 server tracked by L2Index.
            </p>
          </div>
          <form onSubmit={submitSearch} className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, previous name, domain, chronicle, rates…"
              className="w-full h-10 pl-9 pr-9 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/60"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(""); navigate({ to: "/browse", search: {} }); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </form>
        </div>

        {/* Filters */}
        <div className="bg-surface/60 border border-border rounded-xl p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <FilterSelect label="Chronicle" value={chronicle} onChange={setChronicle}
              options={[["", "All Chronicles"], ...CHRONICLES.map((c) => [c, c] as [string, string])]} />
            <FilterSelect label="Rates" value={rateBucket} onChange={setRateBucket}
              options={[
                ["", "All Rates"],
                ["low", "Low (x1–x5)"],
                ["mid", "Mid (x6–x50)"],
                ["high", "High (x51–x500)"],
                ["extreme", "Extreme (x500+)"],
              ]} />
            <FilterSelect label="Region" value={region} onChange={setRegion}
              options={[["", "All Regions"], ...REGIONS.map((r) => [r, r] as [string, string])]} />
            <FilterSelect label="Status" value={status} onChange={setStatus}
              options={[["", "Any Status"], ...STATUSES.map((s) => [s, s] as [string, string])]} />
            <FilterSelect label="Trust" value={trust} onChange={setTrust}
              options={[["", "Any Trust"], ...TRUST_BADGES.map((t) => [t, t[0].toUpperCase() + t.slice(1)] as [string, string])]} />
            <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(v as SortId)}
              options={SORTS.map((s) => [s.id, s.label] as [string, string])} />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="text-white font-semibold">{filtered.length}</span> of{" "}
              <span className="text-white font-semibold">{data?.length ?? 0}</span> servers
            </div>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                hasActiveFilters
                  ? "border-border text-white hover:bg-surface-hover"
                  : "border-border/50 text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <RotateCcw className="size-3.5" /> Reset Filters
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {chronicleCounts.slice(0, 12).map(([c, n]) => (
            <button
              key={c}
              onClick={() => setChronicle(chronicle === c ? "" : c)}
              className={cn(
                "text-[11px] font-mono px-2 py-1 rounded border transition-colors",
                chronicle === c
                  ? "bg-brand/15 border-brand/40 text-brand"
                  : "bg-surface border-border text-muted-foreground hover:text-white",
              )}
            >
              {c} <span className="opacity-60">· {n}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface/40 border border-border rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[36px_1fr_120px_80px_140px_90px_80px] gap-3 items-center px-3 py-2 border-b border-border bg-surface/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div></div>
            <div>Server</div>
            <div>Chronicle</div>
            <div>Rates</div>
            <div>Region</div>
            <div className="text-center">Trust</div>
            <div className="text-right">Votes</div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading servers…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm font-semibold text-white">No matching servers</div>
              <div className="text-xs text-muted-foreground mt-1">Try clearing filters or adjusting your search.</div>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => navigate({ to: "/server/$id", params: { id: s.id } })}
                    className="w-full grid grid-cols-[36px_1fr_auto] md:grid-cols-[36px_1fr_120px_80px_140px_90px_80px] gap-3 items-center px-3 py-2 text-left hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:bg-surface-hover"
                  >
                    <div className="size-8 rounded bg-background border border-border overflow-hidden grid place-items-center shrink-0">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-[9px] text-muted-foreground font-mono font-bold">
                          {s.current_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.current_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate md:hidden">
                        {s.chronicle} · x{String(s.rates).replace(/^x/i, "")} · {s._region}
                      </div>
                      {s.domain && (
                        <div className="hidden md:block text-[10px] text-muted-foreground truncate">{s.domain}</div>
                      )}
                    </div>

                    <div className="hidden md:block">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                        {s.chronicle}
                      </span>
                    </div>
                    <div className="hidden md:block">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                        x{String(s.rates).replace(/^x/i, "")}
                      </span>
                    </div>
                    <div className="hidden md:block text-[11px] text-muted-foreground truncate">
                      {s.country ? `${s.country}` : s._region}
                      {s._status === "Opening Soon" && (
                        <span className="ml-1 text-[9px] font-mono px-1 py-0 rounded bg-accent/10 text-accent border border-accent/20">
                          SOON
                        </span>
                      )}
                    </div>
                    <div className="hidden md:flex justify-center">
                      <ShieldBadge firstSeenAt={s.first_seen_at} topRankYears={s.top_rank_years ?? 0} size="sm" />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold tabular-nums text-white">{s.votes.toLocaleString()}</span>
                      <div className="hidden md:block text-[9px] text-muted-foreground uppercase">votes</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 bg-background border border-border rounded-md px-2 text-xs text-white focus:outline-none focus:border-brand/60"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
