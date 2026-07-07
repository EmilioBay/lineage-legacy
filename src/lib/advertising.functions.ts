import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PROMOTION_TYPES = [
  { value: "banner", label: "Homepage Banner", costPerDay: 50 },
  { value: "sponsored_new", label: "Sponsored (New Servers)", costPerDay: 30 },
  { value: "spotlight", label: "Spotlight Row", costPerDay: 20 },
] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number]["value"];

export const getAdvertisingDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: servers }, { data: wallet }, { data: transactions }, { data: promotions }] =
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
          .limit(50),
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

    return {
      hasApproved: approved.length > 0,
      servers: servers ?? [],
      approvedServers: approved,
      balance: wallet?.balance ?? 0,
      transactions: transactions ?? [],
      promotions: (promotions ?? []).map((p) => ({
        ...p,
        server_name: promoServerNames[p.server_id] ?? "—",
      })),
      pricing: PROMOTION_TYPES,
    };
  });

const createPromotionInput = z.object({
  server_id: z.string().uuid(),
  type: z.enum(["banner", "sponsored_new", "spotlight"]),
  days: z.number().int().min(1).max(90),
});

export const createTokenPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createPromotionInput.parse(data))
  .handler(async ({ data, context }) => {
    const price = PROMOTION_TYPES.find((p) => p.value === data.type);
    if (!price) throw new Error("Invalid promotion type");
    const cost = price.costPerDay * data.days;

    const { data: promoId, error } = await context.supabase.rpc("create_token_promotion", {
      _server_id: data.server_id,
      _type: data.type,
      _days: data.days,
      _cost: cost,
    });
    if (error) throw new Error(error.message);
    return { id: promoId, cost };
  });
