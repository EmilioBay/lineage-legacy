export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50 py-12 px-6 mt-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <p className="text-lg font-extrabold text-white tracking-tighter">L2INDEX</p>
          <p className="text-xs text-muted-foreground mt-2">Transparency is the core of our ranking engine.</p>
        </div>
        <div className="text-muted-foreground/60 text-[10px] font-mono">
          © {new Date().getFullYear()} L2INDEX · HISTORY IS PERMANENT
        </div>
      </div>
    </footer>
  );
}
