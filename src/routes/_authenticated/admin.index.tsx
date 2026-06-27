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

  const mutation = useMutation({
    mutationFn: async (v: { id: string; status: "approved" | "rejected" | "suspended" | "pending" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (checking) return <Shell><p className="text-muted-foreground">Checking permissions…</p></Shell>;
  if (!admin?.isAdmin) return (
    <Shell>
      <div className="border border-dashed border-border rounded-xl p-12 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Admin only</h2>
        <p className="text-muted-foreground text-sm">You don't have admin access. <Link to="/dashboard" className="text-brand hover:underline">Back to dashboard</Link>.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      {error && <p className="text-destructive text-sm mb-4">{(error as Error).message}</p>}
      <div className="space-y-3">
        {servers?.map((s) => (
          <div key={s.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to="/server/$id" params={{ id: s.id }} className="font-bold text-white hover:text-brand truncate">{s.current_name}</Link>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  s.status === "approved" ? "bg-brand/10 text-brand border-brand/30" :
                  s.status === "pending" ? "bg-accent/10 text-accent border-accent/30" :
                  "bg-destructive/10 text-destructive border-destructive/30"
                }`}>{s.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{s.domain} · {s.chronicle} · x{s.rates.replace(/^x/i, "")}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to="/admin/preview/$id" params={{ id: s.id }} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-semibold">Preview Submission</Link>
              {s.status !== "approved" && <button onClick={() => mutation.mutate({ id: s.id, status: "approved" })} className="bg-brand text-brand-foreground px-3 py-1.5 rounded text-xs font-semibold">Approve</button>}
              {s.status !== "rejected" && <button onClick={() => mutation.mutate({ id: s.id, status: "rejected" })} className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded text-xs font-semibold">Reject</button>}
              {s.status === "approved" && <button onClick={() => mutation.mutate({ id: s.id, status: "suspended" })} className="bg-white/10 px-3 py-1.5 rounded text-xs font-semibold">Suspend</button>}
            </div>
          </div>
        ))}
        {!servers?.length && <p className="text-muted-foreground text-sm">No servers yet.</p>}
      </div>
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
