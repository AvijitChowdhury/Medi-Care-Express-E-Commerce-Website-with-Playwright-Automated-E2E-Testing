import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { toBnDigits } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "হোম" },
  { to: "/products", label: "সব পণ্য" },
  { to: "/about", label: "আমাদের সম্পর্কে" },
  { to: "/track", label: "অর্ডার ট্র্যাক" },
  { to: "/contact", label: "যোগাযোগ" },
] as const;

export function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const count = useCart((s) => s.items.reduce((a, b) => a + b.qty, 0));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/products", search: { q: q.trim() } as any });
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <button className="md:hidden p-2 -ml-2" onClick={() => setOpen(!open)} aria-label="মেনু">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-primary">মেডিকেয়ার</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-foreground/80 hover:text-primary transition-colors" activeProps={{ className: "text-primary font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-muted rounded-md" aria-label="খুঁজুন" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-5 w-5" />
          </button>
          <Link to={user ? "/account" : "/login"} className="p-2 hover:bg-muted rounded-md" aria-label="অ্যাকাউন্ট">
            <User className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="p-2 hover:bg-muted rounded-md relative" aria-label="কার্ট">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {toBnDigits(count)}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border bg-background">
          <form onSubmit={submitSearch} className="container mx-auto px-4 py-3 flex gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="flex-1 h-10 px-3 rounded-md border border-input bg-background outline-none focus-visible:ring-1 focus-visible:ring-ring text-sm"
            />
            <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm">খুঁজুন</button>
          </form>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-3 flex flex-col">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 border-b border-border/50 text-sm">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
