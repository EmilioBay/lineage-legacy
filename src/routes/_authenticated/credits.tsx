import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getAdvertisingDashboard, CREDIT_PACKAGES } from "@/lib/advertising.functions";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "Buy Index Credits — L2Index" },
      { name: "description", content: "Purchase Index Credits to promote your Lineage 2 server on L2Index." },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const fetchDashboard = useServerFn(getAdvertisingDashboard);
  const { data } = useQuery({
    queryKey: ["advertising-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Index Credits</h1>
            <p className="text-xs text-muted-foreground mt-1">Spend credits on banner and homepage promotions. 1 credit ≈ €1.</p>
          </div>
          <div className="bg-surface border border-brand/30 rounded-lg px-4 py-2 text-right">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Balance</div>
            <div className="text-xl font-black text-brand">{(data?.balance ?? 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CREDIT_PACKAGES.map((pkg) => {
            const best = pkg.label === "Best Value";
            return (
              <div key={pkg.credits} className={`relative bg-surface border rounded-xl p-5 flex flex-col ${best ? "border-brand/60" : "border-border"}`}>
                {best && <span className="absolute -top-2 right-3 text-[9px] uppercase font-bold bg-brand text-brand-foreground px-2 py-0.5 rounded">Best Value</span>}
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{pkg.label}</div>
                <div className="text-4xl font-black text-brand mt-1">{pkg.credits}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Credits</div>
                <div className="mt-3 text-white text-lg font-bold">€{pkg.price_eur}</div>
                <div className="text-[10px] text-muted-foreground">
                  €{(pkg.price_eur / pkg.credits).toFixed(2)} per credit
                </div>
                <button
                  onClick={() => toast.info("Payments coming soon — checkout will be enabled shortly.")}
                  className="mt-4 w-full text-xs font-semibold bg-brand text-brand-foreground py-2 rounded hover:opacity-90 transition"
                >
                  Buy Now
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-surface/50 border border-border rounded-lg p-4 text-xs text-muted-foreground">
          Credits never expire. Use them on any active or upcoming promotion.{" "}
          <Link to="/promote" className="text-brand hover:underline">Go to Advertising →</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
