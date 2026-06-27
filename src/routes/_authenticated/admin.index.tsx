import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { adminListServers, adminSetServerStatus, checkIsAdmin } from "@/lib/servers.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — L2Index" }] }),
  component: Admin,
});

type StatusFilter = "all" | "pending" | "changes_requested" | "approved" | "rejected" | "suspended";

function Admin() {
  const list = useServerFn(adminListServers);
  const setStatus = useServerFn(adminSetServerStatus);
  const checkAdmin = useServerFn(checkIsAdmin);

  const { data: admin, isLoading: checking } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin({ data: undefined as never }) });
  const { data: servers, refetch, error } = useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => list({ data: undefined as never }),
    enabled: admin?.isAdmin === true,
  });

  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [noteTarget, setNoteTarget] = useState<{ id: string; name: string; mode: "changes_requested" | "rejected" } | null>(null);
  const [noteText, setNoteText] = useState("");

  const mutation = useMutation({
    mutationFn: async (v: { id: string; status: "approved" | "rejected" | "suspended" | "pending" | "changes_requested"; moderator_note?: string }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Updated"); refetch(); setNoteTarget(null); setNoteText(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = servers ?? [];
    const order: Record<string, number> = { pending: 0, changes_requested: 1, approved: 2, suspended: 3, rejected: 4 };
    return list
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => !search.trim() || s.current_name.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [servers, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, changes_requested: 0, approved: 0, rejected: 0, suspended: 0 };
    (servers ?? []).forEach((s) => { c.all++; c[s.status] = (c[s.status] ?? 0) + 1; });
    return c;
  }, [servers]);

  if (checking) return <Shell><p className="text-muted-foreground">Checking permissions…</p></Shell>;
  if (!admin?.isAdmin) return (
    <Shell>
      <div className="border border-dashed border-border rounded-xl p-12 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Admin only</h2>
        <p className="text-muted-foreground text-sm">You don't have admin access. <Link to="/dashboard" className="text-brand hover:underline">Back to dashboard</Link>.</p>
      </div>
    </Shell>
  );

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "changes_requested", label: "Changes requested" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "suspended", label: "Suspended" },
    { key: "all", label: "All" },
  ];

  return (
    <Shell>
      {error && <p className="text-destructive text-sm mb-4">{(error as Error).message}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key ? "bg-brand text-brand-foreground border-brand" : "bg-surface text-muted-foreground border-border hover:text-white"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.key] ?? 0})</span>
          </button>
        ))}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or domain…"
          className="ml-auto max-w-xs h-8"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="size-10 rounded-md bg-background border border-border overflow-hidden grid place-items-center shrink-0">
              {s.logo_url ? <img src={s.logo_url} alt="" className="size-full object-cover" /> : <span className="text-[10px] font-mono text-muted-foreground">{s.current_name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to="/admin/preview/$id" params={{ id: s.id }} className="font-bold text-white hover:text-brand truncate">{s.current_name}</Link>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  s.status === "approved" ? "bg-brand/10 text-brand border-brand/30" :
                  s.status === "pending" ? "bg-accent/10 text-accent border-accent/30" :
                  s.status === "changes_requested" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                  "bg-destructive/10 text-destructive border-destructive/30"
                }`}>{s.status.replace("_", " ")}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.domain} · {s.chronicle} · x{s.rates.replace(/^x/i, "")}{s.country ? ` · ${s.country}` : ""}</div>
              {s.moderator_note && (
                <div className="text-xs text-yellow-300/80 mt-1 line-clamp-1" title={s.moderator_note}>📝 {s.moderator_note}</div>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <Link to="/admin/preview/$id" params={{ id: s.id }} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-semibold">Preview</Link>
              {s.status !== "approved" && <button onClick={() => mutation.mutate({ id: s.id, status: "approved" })} className="bg-brand text-brand-foreground px-3 py-1.5 rounded text-xs font-semibold">Approve</button>}
              {s.status !== "changes_requested" && s.status !== "approved" && (
                <button onClick={() => { setNoteTarget({ id: s.id, name: s.current_name, mode: "changes_requested" }); setNoteText(s.moderator_note ?? ""); }} className="bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 px-3 py-1.5 rounded text-xs font-semibold">Request Changes</button>
              )}
              {s.status !== "rejected" && <button onClick={() => { setNoteTarget({ id: s.id, name: s.current_name, mode: "rejected" }); setNoteText(s.moderator_note ?? ""); }} className="bg-destructive/80 hover:bg-destructive text-destructive-foreground px-3 py-1.5 rounded text-xs font-semibold">Reject</button>}
              {s.status === "approved" && <button onClick={() => mutation.mutate({ id: s.id, status: "suspended" })} className="bg-white/10 px-3 py-1.5 rounded text-xs font-semibold">Suspend</button>}
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-muted-foreground text-sm py-6 text-center">No servers match this filter.</p>}
      </div>

      <Dialog open={!!noteTarget} onOpenChange={(o) => { if (!o) { setNoteTarget(null); setNoteText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteTarget?.mode === "changes_requested" ? "Request changes" : "Reject submission"}: {noteTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {noteTarget?.mode === "changes_requested"
              ? "Explain what the owner must correct. They'll see this on their dashboard."
              : "Optional — explain why this submission was rejected."}
          </p>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={6}
            placeholder="e.g. Logo is too low resolution. Please upload at least 256×256."
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteTarget(null); setNoteText(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!noteTarget) return;
                if (noteTarget.mode === "changes_requested" && noteText.trim().length < 5) {
                  toast.error("Please write a short explanation."); return;
                }
                mutation.mutate({ id: noteTarget.id, status: noteTarget.mode, moderator_note: noteText.trim() || undefined });
              }}
              disabled={mutation.isPending}
            >
              {noteTarget?.mode === "changes_requested" ? "Send request" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-8">Admin Panel</h1>
        {children}
      </main>
      <Footer />
    </div>
  );
}
