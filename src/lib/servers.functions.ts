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
    .select("id, current_name, logo_url, chronicle, rates, first_seen_at, country, description, banner_url, website_url")
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

  const withVotes = (servers ?? []).map((s) => ({ ...s, votes: voteCounts[s.id] ?? 0 }));

  // Current season rankings (by votes desc)
  const ranked = [...withVotes].sort((a, b) => b.votes - a.votes).slice(0, 10);

  // Most trusted: by years listed desc, then votes
  const trusted = [...withVotes]
    .map((s) => ({ ...s, ageMs: Date.now() - new Date(s.first_seen_at).getTime() }))
    .sort((a, b) => b.ageMs - a.ageMs || b.votes - a.votes)
    .slice(0, 5);

  // Sponsored new (paid promotions, type sponsored_new)
  const { data: sponsoredPromos } = await sb
    .from("promotions")
    .select("server_id, position, end_date, payment_status, type")
    .eq("type", "sponsored_new")
    .eq("payment_status", "paid")
    .gte("end_date", new Date().toISOString())
    .order("position");

  const sponsoredIds = (sponsoredPromos ?? []).slice(0, 3).map((p) => p.server_id);
  const sponsoredNew = withVotes.filter((s) => sponsoredIds.includes(s.id));

  // Newest 7 organic (not in sponsored)
  const organicNew = [...withVotes]
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

    const [{ data: nameHistory }, { data: domainHistory }, { data: yearly }, { data: stats }, { data: votes }] = await Promise.all([
      sb.from("server_name_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      sb.from("server_domain_history").select("*").eq("server_id", data.id).order("changed_at", { ascending: false }),
      sb.from("yearly_rankings").select("*").eq("server_id", data.id).order("year", { ascending: false }).limit(5),
      sb.from("server_stats").select("date, rank, votes").eq("server_id", data.id).order("date"),
      sb.from("votes").select("id").eq("server_id", data.id).eq("vote_year", currentYear),
    ]);

    return {
      server,
      nameHistory: nameHistory ?? [],
      domainHistory: domainHistory ?? [],
      yearly: yearly ?? [],
      stats: stats ?? [],
      currentSeasonVotes: votes?.length ?? 0,
    };
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

// ----- Owner: create server -----
const createServerSchema = z.object({
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
        rates: data.rates,
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

// ----- Admin: list all pending servers -----
export const adminListServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase.from("servers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetServerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected", "suspended"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("servers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    return { isAdmin: Boolean(data) };
  });
