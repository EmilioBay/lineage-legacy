import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type PromotionType =
  | "banner"
  | "banner_left"
  | "banner_right"
  | "spotlight"
  | "sponsored"
  | "sponsored_new";

export const CREDIT_PACKAGES = [
  { credits: 10,  price_eur: 10, label: "Starter" },
  { credits: 25,  price_eur: 24, label: "Basic" },
  { credits: 50,  price_eur: 45, label: "Pro" },
  { credits: 100, price_eur: 85, label: "Best Value" },
] as const;

// ---------- Public pricing ----------
export const getPromotionPricing = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("promotion_pricing")
    .select("type, name, description, cost_per_day, exclusive")
    .order("cost_per_day", { ascending: false });
  return (data ?? []) as {
    type: PromotionType; name: string; description: string; cost_per_day: number; exclusive: boolean;
  }[];
});

// ---------- Dashboard ----------
export const getAdvertisingDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: servers }, { data: wallet }, { data: transactions }, { data: promotions }, { data: pricing }] =
      await Promise.all([
        supabase
          .from("servers")
          .select("id, current_name, logo_url, chronicle, rates, status")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("user_tokens").select("balance").eq("user_id", userId).maybeSingle(),
        supabase
          .from("token_transactions")
          .select("id, amount, type, description, created_at, promotion_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("promotions")
          .select("id, server_id, type, start_date, end_date, token_cost, payment_status, created_at")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("promotion_pricing")
          .select("type, name, description, cost_per_day, exclusive")
          .order("cost_per_day", { ascending: false }),
      ]);

    const approved = (servers ?? []).filter((s) => s.status === "approved");
    const promoServerIds = Array.from(new Set((promotions ?? []).map((p) => p.server_id)));
    let promoServerNames: Record<string, string> = {};
    if (promoServerIds.length > 0) {
      const { data: rows } = await supabase
        .from("servers")
        .select("id, current_name")
        .in("id", promoServerIds);
      promoServerNames = Object.fromEntries((rows ?? []).map((r) => [r.id, r.current_name]));
    }

    // Slot availability for exclusive types: look up latest paid promotion end_date across all users
    const priceRows = (pricing ?? []) as { type: PromotionType; name: string; description: string; cost_per_day: number; exclusive: boolean }[];
    const exclusiveTypes = priceRows.filter((p) => p.exclusive).map((p) => p.type);
    let slotState: Record<string, { occupied: boolean; next_available: string | null }> = {};
    if (exclusiveTypes.length > 0) {
      const nowIso = new Date().toISOString();
      const { data: active } = await supabase
        .from("promotions")
        .select("type, end_date")
        .in("type", exclusiveTypes)
        .eq("payment_status", "paid")
        .gt("end_date", nowIso);
      const grouped: Record<string, string[]> = {};
      (active ?? []).forEach((r) => {
        (grouped[r.type] ??= []).push(r.end_date);
      });
      for (const t of exclusiveTypes) {
        const ends = grouped[t] ?? [];
        if (ends.length > 0) {
          const latest = ends.sort().slice(-1)[0];
          slotState[t] = { occupied: true, next_available: latest };
        } else {
          slotState[t] = { occupied: false, next_available: null };
        }
      }
    }

    const nowMs = Date.now();
    const enrichedPromos = (promotions ?? []).map((p) => ({
      ...p,
      server_name: promoServerNames[p.server_id] ?? "—",
      is_active: p.payment_status === "paid" && new Date(p.end_date).getTime() > nowMs,
      is_pending: p.payment_status === "pending",
    }));

    return {
      hasApproved: approved.length > 0,
      servers: servers ?? [],
      approvedServers: approved,
      balance: wallet?.balance ?? 0,
      transactions: transactions ?? [],
      promotions: enrichedPromos,
      pricing: priceRows,
      slotState,
      packages: CREDIT_PACKAGES,
    };
  });

// ---------- Create promotion (uses server-side pricing) ----------
const createInput = z.object({
  server_id: z.string().uuid(),
  type: z.enum(["banner", "banner_left", "banner_right", "spotlight", "sponsored", "sponsored_new"]),
  days: z.number().int().min(1).max(90),
});

export const createTokenPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: price, error: priceErr } = await context.supabase
      .from("promotion_pricing")
      .select("cost_per_day, exclusive")
      .eq("type", data.type)
      .maybeSingle();
    if (priceErr || !price) throw new Error("Unknown promotion type");

    if (price.exclusive) {
      const nowIso = new Date().toISOString();
      const { data: active } = await context.supabase
        .from("promotions")
        .select("id")
        .eq("type", data.type)
        .eq("payment_status", "paid")
        .gt("end_date", nowIso)
        .limit(1);
      if (active && active.length > 0) throw new Error("This slot is currently occupied");
    }

    const cost = price.cost_per_day * data.days;
    const { data: promoId, error } = await context.supabase.rpc("create_token_promotion", {
      _server_id: data.server_id,
      _type: data.type,
      _days: data.days,
      _cost: cost,
    });
    if (error) throw new Error(error.message);
    return { id: promoId, cost };
  });

// ---------- Renew promotion ----------
const renewInput = z.object({ promotion_id: z.string().uuid(), days: z.number().int().min(1).max(90) });

export const renewPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: promo, error } = await context.supabase
      .from("promotions")
      .select("server_id, type, owner_id, end_date")
      .eq("id", data.promotion_id)
      .maybeSingle();
    if (error || !promo) throw new Error("Promotion not found");
    if (promo.owner_id !== context.userId) throw new Error("Not your promotion");

    const { data: price } = await context.supabase
      .from("promotion_pricing")
      .select("cost_per_day")
      .eq("type", promo.type)
      .maybeSingle();
    if (!price) throw new Error("Pricing not found");
    const cost = price.cost_per_day * data.days;

    const { data: newId, error: rpcErr } = await context.supabase.rpc("create_token_promotion", {
      _server_id: promo.server_id,
      _type: promo.type,
      _days: data.days,
      _cost: cost,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return { id: newId, cost };
  });

// ---------- Buy credits (placeholder, no payment yet) ----------
export const buyCreditsPlaceholder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ credits: z.number().int().positive() }).parse(d))
  .handler(async () => {
    throw new Error("Payments coming soon — Index Credit purchases will be enabled shortly.");
  });

// ---------- Admin: pricing ----------
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admin only");
}

export const adminListPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("promotion_pricing")
      .select("type, name, description, cost_per_day, exclusive, updated_at")
      .order("cost_per_day", { ascending: false });
    return data ?? [];
  });

const updatePricingInput = z.object({
  type: z.enum(["banner", "banner_left", "banner_right", "spotlight", "sponsored", "sponsored_new"]),
  cost_per_day: z.number().int().min(1).max(100000),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  exclusive: z.boolean().optional(),
});

export const adminUpdatePricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePricingInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = {
      cost_per_day: data.cost_per_day,
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.exclusive !== undefined) patch.exclusive = data.exclusive;
    const { error } = await context.supabase.from("promotion_pricing").update(patch).eq("type", data.type);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Ownership claims ----------
export const getOwnershipClaimStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ server_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("ownership_claims")
      .select("id, status, created_at")
      .eq("server_id", data.server_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1);
    return rows?.[0] ?? null;
  });

export const createOwnershipClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    server_id: z.string().uuid(),
    message: z.string().min(10).max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: srv } = await context.supabase
      .from("servers").select("owner_id").eq("id", data.server_id).maybeSingle();
    if (!srv) throw new Error("Server not found");
    if (srv.owner_id === context.userId) throw new Error("You already own this server");

    const { data: existing } = await context.supabase
      .from("ownership_claims")
      .select("id")
      .eq("server_id", data.server_id)
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .limit(1);
    if (existing && existing.length > 0) throw new Error("You already have a pending claim for this server");

    const { error } = await context.supabase.from("ownership_claims").insert({
      server_id: data.server_id,
      user_id: context.userId,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListOwnershipClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: claims } = await context.supabase
      .from("ownership_claims")
      .select("id, server_id, user_id, message, status, admin_note, created_at, decided_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = claims ?? [];
    if (rows.length === 0) return [];
    const serverIds = Array.from(new Set(rows.map((r) => r.server_id)));
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const [{ data: srv }, adminClient] = await Promise.all([
      context.supabase.from("servers").select("id, current_name, domain, owner_id").in("id", serverIds),
      import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin),
    ]);
    const nameMap = Object.fromEntries((srv ?? []).map((s) => [s.id, s]));
    const emailMap: Record<string, string> = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(uid);
        if (data.user?.email) emailMap[uid] = data.user.email;
      } catch { /* noop */ }
    }));

    return rows.map((r) => ({
      ...r,
      server_name: nameMap[r.server_id]?.current_name ?? "—",
      server_domain: nameMap[r.server_id]?.domain ?? "",
      current_owner_id: nameMap[r.server_id]?.owner_id ?? null,
      user_email: emailMap[r.user_id] ?? "—",
    }));
  });

export const adminDecideOwnershipClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    admin_note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: claim, error } = await context.supabase
      .from("ownership_claims")
      .select("id, server_id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !claim) throw new Error("Claim not found");
    if (claim.status !== "pending") throw new Error("Claim already decided");

    await context.supabase.from("ownership_claims").update({
      status: data.decision,
      admin_note: data.admin_note ?? null,
      decided_at: new Date().toISOString(),
    }).eq("id", data.id);

    if (data.decision === "approved") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: upErr } = await supabaseAdmin
        .from("servers")
        .update({ owner_id: claim.user_id })
        .eq("id", claim.server_id);
      if (upErr) throw new Error(upErr.message);
    }
    return { ok: true };
  });
