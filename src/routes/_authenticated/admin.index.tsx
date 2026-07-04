import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Eye, Check, X, MessageSquareWarning, Pause, StickyNote, ExternalLink } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { adminListServers, adminSetServerStatus, adminUpdateAdminNotes, checkIsAdmin } from "@/lib/servers.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — L2Index" }] }),
  component: Admin,
});

type StatusFilter = "all" | "pending" | "changes_requested" | "approved" | "rejected" | "suspended";
type ServerRow = Awaited<ReturnType<typeof adminListServers>>[number];

const REJECT_REASONS = [
  "Website offline",
  "Duplicate server",
  "Fake information",
  "Missing information",
  "Rule violation",
  "Other",
];

function Admin() {
  const list = useServerFn(adminListServers);
  const setStatus = useServerFn(adminSetServerStatus);
  const updateNotes = useServerFn(adminUpdateAdminNotes);
  const checkAdmin = useServerFn(checkIsAdmin);

  const { data: admin, isLoading: checking } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin({ data: undefined as never }) });
  const { data: servers, refetch, error } = useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => list({ data: undefined as never }),
    enabled: admin?.isAdmin === true,
  });

  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");

  const [modMode, setModMode] = useState<"changes_requested" | "rejected" | null>(null);
  const [modTarget, setModTarget] = useState<ServerRow | null>(null);
  const [modText, setModText] = useState("");
  const [modReason, setModReason] = useState<string>("Website offline");

  const [notesTarget, setNotesTarget] = useState<ServerRow | null>(null);
  const [notesText, setNotesText] = useState("");

  const mutation = useMutation({
    mutationFn: async (v: { id: string; status: "approved" | "rejected" | "suspended" | "pending" | "changes_requested"; moderator_note?: string; reject_reason?: string }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Updated"); refetch(); setModMode(null); setModTarget(null); setModText(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const notesMutation = useMutation({
    mutationFn: async (v: { id: string; admin_notes: string | null }) => updateNotes({ data: v }),
    onSuccess: () => { toast.success("Notes saved"); refetch(); setNotesTarget(null); setNotesText(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const rows = servers ?? [];
    const q = search.trim().toLowerCase();
    const order: Record<string, number> = { pending: 0, changes_requested: 1, approved: 2, suspended: 3, rejected: 4 };
    return rows
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => {
        if (!q) return true;
        return (
          s.current_name.toLowerCase().includes(q) ||
          s.domain.toLowerCase().includes(q) ||
          (s.country ?? "").toLowerCase().includes(q) ||
          (s.owner_email ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    { key: "suspended", label: "Suspended" },
    { key: "rejected", label: "Rejected" },
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
        <div className="ml-auto relative w-72 max-w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, prev name, domain, owner…"
            className="pl-8 h-8"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-bold">Server</th>
                <th className="text-left px-3 py-2 font-bold">Chronicle</th>
                <th className="text-left px-3 py-2 font-bold">Rates</th>
                <th className="text-left px-3 py-2 font-bold">Country</th>
                <th className="text-left px-3 py-2 font-bold">Owner</th>
                <th className="text-left px-3 py-2 font-bold">Submitted</th>
                <th className="text-left px-3 py-2 font-bold">Status</th>
                <th className="text-right px-3 py-2 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border/60 hover:bg-background/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-md bg-background border border-border overflow-hidden grid place-items-center shrink-0">
                        {s.logo_url ? <img src={s.logo_url} alt="" className="size-full object-cover" /> : <span className="text-[10px] font-mono text-muted-foreground">{s.current_name.slice(0,2).toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <Link to="/admin/preview/$id" params={{ id: s.id }} className="font-bold text-white hover:text-brand truncate block">{s.current_name}</Link>
                        <div className="text-[11px] text-muted-foreground truncate font-mono">
                          {s.domain}
                          {s.serial_id ? <span className="ml-2 text-muted-foreground/60">#{String(s.serial_id).padStart(6, "0")}</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white">{s.chronicle}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white">x{s.rates.replace(/^x/i, "")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.country ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[180px]" title={s.owner_email ?? ""}>{s.owner_email ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={s.status} />
                    {s.moderator_note && (
                      <div className="text-[10px] text-yellow-300/80 mt-1 line-clamp-1 max-w-[160px]" title={s.moderator_note}>📝 {s.moderator_note}</div>
                    )}
                    {s.reject_reason && (
                      <div className="text-[10px] text-destructive/90 mt-1">⛔ {s.reject_reason}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <IconAction title="Preview" as={Link} to="/admin/preview/$id" params={{ id: s.id }}><Eye className="size-3.5" /></IconAction>
                      {s.status === "approved" && (
                        <IconAction title="Open live" as="a" href={`/server/${s.id}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /></IconAction>
                      )}
                      <IconAction title="Admin notes" onClick={() => { setNotesTarget(s); setNotesText(s.admin_notes ?? ""); }} tone={s.admin_notes ? "notes-filled" : "default"}>
                        <StickyNote className="size-3.5" />
                      </IconAction>
                      {s.status !== "approved" && (
                        <IconAction tone="approve" title="Approve" onClick={() => mutation.mutate({ id: s.id, status: "approved" })}>
                          <Check className="size-3.5" />
                        </IconAction>
                      )}
                      {s.status !== "changes_requested" && s.status !== "approved" && (
                        <IconAction tone="warn" title="Request changes" onClick={() => { setModTarget(s); setModMode("changes_requested"); setModText(s.moderator_note ?? ""); }}>
                          <MessageSquareWarning className="size-3.5" />
                        </IconAction>
                      )}
                      {s.status !== "rejected" && (
                        <IconAction tone="reject" title="Reject" onClick={() => { setModTarget(s); setModMode("rejected"); setModText(s.moderator_note ?? ""); setModReason(s.reject_reason ?? "Website offline"); }}>
                          <X className="size-3.5" />
                        </IconAction>
                      )}
                      {s.status === "approved" && (
                        <IconAction title="Suspend" onClick={() => mutation.mutate({ id: s.id, status: "suspended" })}>
                          <Pause className="size-3.5" />
                        </IconAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No servers match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve/Reject/Request-changes moderator note dialog */}
      <Dialog open={!!modMode} onOpenChange={(o) => { if (!o) { setModMode(null); setModTarget(null); setModText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modMode === "changes_requested" ? "Request changes" : "Reject submission"}
              {modTarget && <span className="text-muted-foreground text-sm font-normal ml-2">— {modTarget.current_name}</span>}
            </DialogTitle>
          </DialogHeader>

          {modMode === "rejected" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Reason</label>
              <Select value={modReason} onValueChange={setModReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {modMode === "changes_requested" ? "Message to owner (required)" : "Optional message to owner"}
            </label>
            <Textarea
              value={modText}
              onChange={(e) => setModText(e.target.value)}
              rows={5}
              placeholder="e.g. Logo is too low resolution. Please upload at least 256×256."
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setModMode(null); setModTarget(null); setModText(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!modTarget || !modMode) return;
                if (modMode === "changes_requested" && modText.trim().length < 5) {
                  toast.error("Please write a short explanation."); return;
                }
                mutation.mutate({
                  id: modTarget.id,
                  status: modMode,
                  moderator_note: modText.trim() || undefined,
                  reject_reason: modMode === "rejected" ? modReason : undefined,
                });
              }}
              disabled={mutation.isPending}
            >
              {modMode === "changes_requested" ? "Send request" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Private admin notes dialog */}
      <Dialog open={!!notesTarget} onOpenChange={(o) => { if (!o) { setNotesTarget(null); setNotesText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin notes {notesTarget && <span className="text-muted-foreground text-sm font-normal">— {notesTarget.current_name}</span>}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Private notes visible only to admins. Never shown to owners.</p>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={6}
            placeholder="e.g. Website dead, waiting for owner reply. Need better logo."
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNotesTarget(null); setNotesText(""); }}>Cancel</Button>
            <Button
              onClick={() => notesTarget && notesMutation.mutate({ id: notesTarget.id, admin_notes: notesText.trim() || null })}
              disabled={notesMutation.isPending}
            >
              Save notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-brand/10 text-brand border-brand/30" :
    status === "pending" ? "bg-accent/10 text-accent border-accent/30" :
    status === "changes_requested" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
    status === "suspended" ? "bg-white/10 text-white/80 border-white/20" :
    "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${cls}`}>{status.replace("_", " ")}</span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IconAction({ children, tone = "default", as, ...rest }: { children: React.ReactNode; tone?: "default" | "approve" | "warn" | "reject" | "notes-filled"; as?: any } & Record<string, unknown>) {
  const base = "inline-flex items-center justify-center size-7 rounded-md border transition-colors";
  const cls = tone === "approve" ? "bg-brand text-brand-foreground border-brand hover:opacity-90"
    : tone === "warn" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/25"
    : tone === "reject" ? "bg-destructive/80 text-destructive-foreground border-destructive hover:bg-destructive"
    : tone === "notes-filled" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20"
    : "bg-background text-white border-border hover:bg-surface";
  const Comp = as ?? "button";
  return <Comp className={`${base} ${cls}`} {...rest}>{children}</Comp>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Panel</h1>
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}
