import { Link } from "@tanstack/react-router";

type Variant = "horizontal" | "side";

const LABELS = ["Advertise Your Server Here", "Premium Banner Available"];

export function AdSlot({ variant, index = 0, className = "" }: { variant: Variant; index?: number; className?: string }) {
  const label = LABELS[index % LABELS.length];
  const base =
    "group relative block overflow-hidden rounded-lg border border-dashed border-border bg-surface/40 hover:bg-surface hover:border-brand/40 transition-colors";
  const size =
    variant === "horizontal"
      ? "h-16 md:h-20"
      : "w-full aspect-[3/4]";

  return (
    <Link to="/advertising" aria-label={label} className={`${base} ${size} ${className}`}>
      <div className="absolute inset-0 grid place-items-center text-center px-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground group-hover:text-brand">
            {label}
          </p>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">Click to learn more</p>
        </div>
      </div>
    </Link>
  );
}

export function TopBannerStrip() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <AdSlot key={i} variant="horizontal" index={i} />
        ))}
      </div>
    </div>
  );
}

export function SideRail({ side }: { side: "left" | "right" }) {
  return (
    <aside
      className={`hidden xl:flex flex-col gap-4 w-[180px] shrink-0 sticky top-20 self-start ${
        side === "left" ? "" : ""
      }`}
      aria-label={`${side} advertising rail`}
    >
      <AdSlot variant="side" index={0} />
      <AdSlot variant="side" index={1} />
    </aside>
  );
}

export function WithSideRails({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex gap-6 items-start">
      <SideRail side="left" />
      <div className="flex-1 min-w-0">{children}</div>
      <SideRail side="right" />
    </div>
  );
}
