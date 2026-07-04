import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ----- Homepage data -----
export const getHomepageData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const currentYear = new Date().getFullYear();

  const { data: servers } = await sb
    .from("servers")
    .select("id, current_name, logo_url, chronicle, rates, first_seen_at, country, description, banner_url, website_url, launch_date, server_type")
    .eq("status", "approved");

  const serverIds = (servers ?? []).map((s) => s.id);

  // Vote counts for current year
  let voteCounts: Record<string, number> = {};
  if (serverIds.length > 0) {
    const { data: votes } = await sb
      .from("votes")
      .select("server_id")
      .eq("vote_year", currentYear)
      .in("server_id", serverIds);
    voteCounts = (votes ?? []).reduce<Record<string, number>>((acc, v) => {
      acc[v.server_id] = (acc[v.server_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  // Top-10 yearly finishes per server (ranking consistency for trust)
  let topRankYears: Record<string, number> = {};
  if (serverIds.length > 0) {
    const { data: yr } = await sb
      .from("yearly_rankings")
      .select("server_id, rank")
      .in("server_id", serverIds)
      .lte("rank", 10);
    topRankYears = (yr ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.server_id] = (acc[r.server_id] ?? 0) + 1; return acc;
    }, {});
  }

  const withVotes = (servers ?? []).map((s) => ({
    ...s,
    votes: voteCounts[s.id] ?? 0,
    top_rank_years: topRankYears[s.id] ?? 0,
  }));

  const nowTs = Date.now();
  const isLaunched = (s: { launch_date?: string | null }) =>
    !s.launch_date || new Date(s.launch_date).getTime() <= nowTs;

  const launched = withVotes.filter(isLaunched);

  // Current season rankings (by votes desc) — only launched servers
  const ranked = [...launched].sort((a, b) => b.votes - a.votes).slice(0, 10);

  // Most trusted: blended score of age + top-rank finishes
  const trusted = [...launched]
    .map((s) => {
      const yrs = (nowTs - new Date(s.first_seen_at).getTime()) / (365.25 * 24 * 3600 * 1000);
      return { ...s, _trust: yrs + s.top_rank_years * 1.5 };
    })
    .sort((a, b) => b._trust - a._trust || b.votes - a.votes)
    .slice(0, 10);

  // Opening soon: approved servers with future launch_date
  const openingSoon = withVotes
    .filter((s) => s.launch_date && new Date(s.launch_date).getTime() > nowTs)
    .sort((a, b) => new Date(a.launch_date!).getTime() - new Date(b.launch_date!).getTime())
    .slice(0, 10);

  // Sponsored servers (paid promotions, type sponsored_new) — compact list
  const { data: sponsoredPromos } = await sb
    .from("promotions")
    .select("server_id, position, end_date, payment_status, type")
    .eq("type", "sponsored_new")
    .eq("payment_status", "paid")
    .gte("end_date", new Date().toISOString())
    .order("position");

  const sponsoredIds = (sponsoredPromos ?? []).map((p) => p.server_id);
  const sponsoredNew = withVotes
    .filter((s) => sponsoredIds.includes(s.id))
    .slice(0, 10);

  // Newest organic kept for compatibility (unused on new homepage)
  const organicNew = [...launched]
    .filter((s) => !sponsoredIds.includes(s.id))
    .sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime())
    .slice(0, 7);

  // Banners
  const { data: bannerPromos } = await sb
    .from("promotions")
    .select("server_id, end_date, payment_status, type")
    .eq("type", "banner")
    .eq("payment_status", "paid")
    .gte("end_date", new Date().toISOString());

  const bannerServerIds = (bannerPromos ?? []).map((b) => b.server_id);
  const banners = withVotes.filter((s) => bannerServerIds.includes(s.id)).slice(0, 2);

  return {
    ranked,
    trusted,
    sponsoredNew,
    organicNew,
    openingSoon,
    banners,
    totalServers: withVotes.length,
    totalVotes: Object.values(voteCounts).reduce((a, b) => a + b, 0),
  };
});

// ----- Server detail -----
export const getServerDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const currentYear = new Date().getFullYear();

    const { data: server } = await sb
      .from("servers")
      .select("*")
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();

    if (!server) return null;

    const [{ data: nameHistory }, { data: domainHistory }, { data: yearly }, { data: stats }, { data: votes }, { data: allApproved }, { data: allVotes }, { count: lifetimeVotes }] = await Promise.all([
      sb.from("server_name_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      sb.from("server_domain_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      sb.from("yearly_rankings").select("*").eq("server_id", data.id).order("year", { ascending: false }).limit(10),
      sb.from("server_stats").select("date, rank, votes").eq("server_id", data.id).order("date"),
      sb.from("votes").select("id").eq("server_id", data.id).eq("vote_year", currentYear),
      sb.from("servers").select("id, current_name, logo_url, chronicle, rates, first_seen_at, country").eq("status", "approved"),
      sb.from("votes").select("server_id").eq("vote_year", currentYear),
      sb.from("votes").select("id", { count: "exact", head: true }).eq("server_id", data.id),
    ]);

    const tallies = (allVotes ?? []).reduce<Record<string, number>>((acc, v) => {
      acc[v.server_id] = (acc[v.server_id] ?? 0) + 1; return acc;
    }, {});
    const ranking = (allApproved ?? [])
      .map((s) => ({ id: s.id, votes: tallies[s.id] ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
    const rankIdx = ranking.findIndex((r) => r.id === data.id);
    const currentRank = rankIdx >= 0 ? rankIdx + 1 : null;

    const targetRate = parseInt(String(server.rates).replace(/[^0-9]/g, ""), 10) || 0;
    const similar = (allApproved ?? [])
      .filter((s) => s.id !== data.id && s.chronicle === server.chronicle)
      .map((s) => {
        const r = parseInt(String(s.rates).replace(/[^0-9]/g, ""), 10) || 0;
        return { ...s, _diff: Math.abs(r - targetRate), votes: tallies[s.id] ?? 0 };
      })
      .sort((a, b) => a._diff - b._diff || b.votes - a.votes)
      .slice(0, 4);

    return {
      server,
      nameHistory: nameHistory ?? [],
      domainHistory: domainHistory ?? [],
      yearly: yearly ?? [],
      stats: stats ?? [],
      currentSeasonVotes: votes?.length ?? 0,
      lifetimeVotes: lifetimeVotes ?? 0,
      currentRank,
      totalRanked: ranking.length,
      similar,
    };
  });

// ----- Autocomplete search: name, prev names, domain, chronicle, country, rates -----
export const searchServers = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const term = `%${data.q}%`;
    const q = data.q.toLowerCase();

    const [{ data: direct }, { data: nameHits }, { data: domainHits }] = await Promise.all([
      sb.from("servers")
        .select("id, current_name, logo_url, chronicle, rates, country, domain, first_seen_at")
        .eq("status", "approved")
        .or(`current_name.ilike.${term},domain.ilike.${term},chronicle.ilike.${term},country.ilike.${term},rates.ilike.${term}`)
        .limit(20),
      sb.from("server_name_history").select("server_id, old_name").ilike("old_name", term).limit(20),
      sb.from("server_domain_history").select("server_id, old_domain").ilike("old_domain", term).limit(20),
    ]);

    const matchReasonById: Record<string, string> = {};
    for (const r of direct ?? []) {
      if (r.current_name?.toLowerCase().includes(q)) matchReasonById[r.id] = `Name: ${r.current_name}`;
      else if (r.domain?.toLowerCase().includes(q)) matchReasonById[r.id] = `Domain: ${r.domain}`;
      else if (r.chronicle?.toLowerCase().includes(q)) matchReasonById[r.id] = `Chronicle: ${r.chronicle}`;
      else if (r.country?.toLowerCase().includes(q)) matchReasonById[r.id] = `Country: ${r.country}`;
      else if (String(r.rates).toLowerCase().includes(q)) matchReasonById[r.id] = `Rate: x${String(r.rates).replace(/^x/i, "")}`;
    }
    for (const h of nameHits ?? []) matchReasonById[h.server_id] ??= `Previously: ${h.old_name}`;
    for (const h of domainHits ?? []) matchReasonById[h.server_id] ??= `Previous domain: ${h.old_domain}`;

    const existing = new Set((direct ?? []).map((s) => s.id));
    const missingIds = Object.keys(matchReasonById).filter((id) => !existing.has(id));
    let extras: NonNullable<typeof direct> = [];
    if (missingIds.length) {
      const { data: more } = await sb.from("servers")
        .select("id, current_name, logo_url, chronicle, rates, country, domain, first_seen_at")
        .eq("status", "approved").in("id", missingIds);
      extras = more ?? [];
    }
    const combined = [...(direct ?? []), ...extras].slice(0, 12);
    return combined.map((s) => ({ ...s, match: matchReasonById[s.id] ?? `Name: ${s.current_name}` }));
  });


// ----- Browse / search -----
export const listServers = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const currentYear = new Date().getFullYear();
    let query = sb.from("servers").select("id, current_name, logo_url, chronicle, rates, first_seen_at, domain").eq("status", "approved");
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      // Search current name & domain
      query = query.or(`current_name.ilike.${term},domain.ilike.${term}`);
    }
    const { data: servers } = await query.limit(100);

    // For name-history search, fetch matching server ids too
    let extraIds: string[] = [];
    if (data.q && data.q.trim()) {
      const { data: nh } = await sb
        .from("server_name_history")
        .select("server_id")
        .ilike("old_name", `%${data.q.trim()}%`);
      extraIds = (nh ?? []).map((r) => r.server_id);
    }

    let combined = servers ?? [];
    if (extraIds.length) {
      const existing = new Set(combined.map((s) => s.id));
      const missing = extraIds.filter((id) => !existing.has(id));
      if (missing.length) {
        const { data: more } = await sb
          .from("servers")
          .select("id, current_name, logo_url, chronicle, rates, first_seen_at, domain")
          .eq("status", "approved")
          .in("id", missing);
        combined = combined.concat(more ?? []);
      }
    }

    const ids = combined.map((s) => s.id);
    let voteCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: votes } = await sb
        .from("votes")
        .select("server_id")
        .eq("vote_year", currentYear)
        .in("server_id", ids);
      voteCounts = (votes ?? []).reduce<Record<string, number>>((acc, v) => {
        acc[v.server_id] = (acc[v.server_id] ?? 0) + 1; return acc;
      }, {});
    }
    return combined.map((s) => ({ ...s, votes: voteCounts[s.id] ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
  });

// ----- Public: check name / domain availability -----
export const checkIdentifierAvailability = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ identifier: z.string().trim().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const ident = data.identifier.toLowerCase();
    const { data: rows } = await sb
      .from("servers")
      .select("id, current_name, domain, status")
      .in("status", ["approved", "pending"])
      .or(`current_name.ilike.${ident},domain.ilike.${ident}`);
    const taken = (rows ?? []).some(
      (r) => r.current_name?.toLowerCase() === ident || r.domain?.toLowerCase() === ident,
    );
    return { available: !taken };
  });

// ----- Owner: create server -----
const createServerSchema = z.object({
  current_name: z.string().trim().min(2).max(80),
  website_url: z.string().trim().url().max(255),
  chronicle: z.string().trim().min(1).max(40),
  rates: z.coerce.number().int().min(1).max(999999),
  server_type: z.string().trim().min(1).max(40),
  launch_date: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(100).max(2000),
  logo_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  discord_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  banner_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const createServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createServerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const url = new URL(data.website_url);
    const domain = url.hostname.replace(/^www\./, "").toLowerCase();

    // Conflict rule: name or domain may not match any active server
    const [nameClash, domainClash] = await Promise.all([
      context.supabase.rpc("is_identifier_taken" as never, { _identifier: data.current_name, _exclude_server: null } as never),
      context.supabase.rpc("is_identifier_taken" as never, { _identifier: domain, _exclude_server: null } as never),
    ]);
    if (nameClash.data) throw new Error(`Server name "${data.current_name}" is already in use by an active server.`);
    if (domainClash.data) throw new Error(`Domain "${domain}" is already in use by an active server.`);

    const { data: row, error } = await context.supabase
      .from("servers")
      .insert({
        owner_id: context.userId,
        current_name: data.current_name,
        website_url: data.website_url,
        domain,
        chronicle: data.chronicle,
        rates: String(data.rates),
        server_type: data.server_type,
        launch_date: data.launch_date || null,
        description: data.description,
        logo_url: data.logo_url || null,
        discord_url: data.discord_url || null,
        country: data.country || null,
        banner_url: data.banner_url || null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ----- Owner: list my servers -----
export const getMyServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const currentYear = new Date().getFullYear();
    const { data: servers, error } = await context.supabase
      .from("servers")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (servers ?? []).map((s) => s.id);
    let voteCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: votes } = await context.supabase
        .from("votes").select("server_id")
        .eq("vote_year", currentYear).in("server_id", ids);
      voteCounts = (votes ?? []).reduce<Record<string, number>>((acc, v) => {
        acc[v.server_id] = (acc[v.server_id] ?? 0) + 1; return acc;
      }, {});
    }
    return (servers ?? []).map((s) => ({ ...s, votes: voteCounts[s.id] ?? 0 }));
  });

// ----- Owner: update server (basic info, with name/domain history tracking) -----
const updateSchema = z.object({
  id: z.string().uuid(),
  current_name: z.string().trim().min(2).max(80),
  website_url: z.string().trim().url().max(255),
  chronicle: z.string().trim().min(1).max(40),
  rates: z.string().trim().min(1).max(40),
  description: z.string().trim().min(10).max(2000),
  logo_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  discord_url: z.string().trim().url().max(255).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  banner_url: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const updateServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing, error: fetchErr } = await context.supabase
      .from("servers").select("*").eq("id", data.id).maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("Not found");
    if (existing.owner_id !== context.userId) throw new Error("Forbidden");

    const newUrl = new URL(data.website_url);
    const newDomain = newUrl.hostname.replace(/^www\./, "").toLowerCase();

    // Track name change — 1 free per year, additional renames flagged as paid
    let renameIsPaid = false;
    if (existing.current_name !== data.current_name) {
      // Conflict check
      const { data: clash } = await context.supabase.rpc(
        "is_identifier_taken" as never,
        { _identifier: data.current_name, _exclude_server: data.id } as never,
      );
      if (clash) throw new Error(`Server name "${data.current_name}" is already in use by another active server.`);

      const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const { data: prevChanges } = await context.supabase
        .from("server_name_history").select("id")
        .eq("server_id", data.id).gte("changed_at", yearAgo.toISOString());
      renameIsPaid = (prevChanges?.length ?? 0) >= 1;
      await context.supabase.from("server_name_history").insert({
        server_id: data.id,
        old_name: existing.current_name,
        new_name: data.current_name,
        is_paid: renameIsPaid,
      });
    }
    // Track domain change
    if (existing.domain !== newDomain) {
      const { data: clash } = await context.supabase.rpc(
        "is_identifier_taken" as never,
        { _identifier: newDomain, _exclude_server: data.id } as never,
      );
      if (clash) throw new Error(`Domain "${newDomain}" is already in use by another active server.`);
      await context.supabase.from("server_domain_history").insert({
        server_id: data.id, old_domain: existing.domain, new_domain: newDomain,
      });
    }

    const { error } = await context.supabase.from("servers").update({
      current_name: data.current_name,
      website_url: data.website_url,
      domain: newDomain,
      chronicle: data.chronicle,
      rates: data.rates,
      description: data.description,
      logo_url: data.logo_url || null,
      discord_url: data.discord_url || null,
      country: data.country || null,
      banner_url: data.banner_url || null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Admin: list all servers (with owner email) -----
export const adminListServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase.from("servers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    // Enrich with owner emails
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter((x): x is string => !!x)));
    const owners: Record<string, string> = {};
    if (ownerIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await Promise.all(ownerIds.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) owners[uid] = u.user.email;
      }));
    }
    return rows.map((r) => ({ ...r, owner_email: r.owner_id ? owners[r.owner_id] ?? null : null }));
  });

export const adminSetServerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected", "suspended", "changes_requested"]),
    moderator_note: z.string().trim().max(2000).optional(),
    reject_reason: z.string().trim().max(100).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const update: {
      status: typeof data.status;
      moderator_note?: string | null;
      reject_reason?: string | null;
    } = { status: data.status };
    if (data.status === "changes_requested" || data.status === "rejected") {
      update.moderator_note = data.moderator_note ?? null;
    } else if (data.status === "approved") {
      update.moderator_note = null;
      update.reject_reason = null;
    }
    if (data.status === "rejected") {
      update.reject_reason = data.reject_reason ?? null;
    }
    const { error } = await context.supabase.from("servers").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateAdminNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    admin_notes: z.string().trim().max(2000).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("servers").update({ admin_notes: data.admin_notes || null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetServerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: server } = await context.supabase.from("servers").select("*").eq("id", data.id).maybeSingle();
    if (!server) return null;

    const [{ data: nameHistory }, { data: domainHistory }, { data: yearly }, { data: stats }] = await Promise.all([
      context.supabase.from("server_name_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      context.supabase.from("server_domain_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      context.supabase.from("yearly_rankings").select("*").eq("server_id", data.id).order("year", { ascending: false }).limit(10),
      context.supabase.from("server_stats").select("date, rank, votes").eq("server_id", data.id).order("date"),
    ]);

    // Owner email
    let owner_email: string | null = null;
    if (server.owner_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(server.owner_id);
      owner_email = u?.user?.email ?? null;
    }

    return {
      server: { ...server, owner_email },
      nameHistory: nameHistory ?? [],
      domainHistory: domainHistory ?? [],
      yearly: yearly ?? [],
      stats: stats ?? [],
      currentSeasonVotes: 0,
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    return { isAdmin: Boolean(data) };
  });

