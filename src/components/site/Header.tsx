import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SearchBar } from "@/components/site/SearchBar";


export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link to="/" className="text-lg font-extrabold tracking-tighter text-white flex items-center gap-2 shrink-0">
            <span className="size-8 bg-brand rounded flex items-center justify-center text-sm text-brand-foreground">L2</span>
            <span className="hidden sm:inline">INDEX</span>
          </Link>
          <div className="hidden md:flex items-center gap-3 lg:gap-5 text-sm font-medium text-muted-foreground whitespace-nowrap">
            <Link to="/" activeProps={{ className: "text-white" }} activeOptions={{ exact: true }} className="hover:text-white transition-colors">Rankings</Link>
            <Link to="/browse" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">Browse</Link>
            <Link to="/about" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">About</Link>
            <Link to="/contact" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">Contact</Link>
            {user && (
              <>
                <Link to="/dashboard" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">Dashboard</Link>
                <Link to="/promote" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">Ads</Link>
                <Link to="/credits" activeProps={{ className: "text-white" }} className="hover:text-white transition-colors">Credits</Link>
              </>
            )}
          </div>
        </div>
        <SearchBar className="hidden lg:block w-64 xl:w-80 shrink" />
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {user ? (
            <>
              <Link to="/add-server" className="bg-brand hover:opacity-90 text-brand-foreground px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap">Add Server</Link>
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-white transition-colors whitespace-nowrap">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-white transition-colors whitespace-nowrap">Sign in</Link>
              <Link to="/auth" className="bg-brand hover:opacity-90 text-brand-foreground px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap">Add Server</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
