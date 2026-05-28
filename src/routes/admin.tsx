import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, Store } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "অ্যাডমিন প্যানেল — মেডিকেয়ার" }] }),
  component: AdminLayout, // reg
});

const nav = [
  { to: "/admin", label: "ড্যাশবোর্ড", Icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "অর্ডার", Icon: ShoppingBag },
  { to: "/admin/products", label: "পণ্য", Icon: Package },
  { to: "/admin/customers", label: "গ্রাহক", Icon: Users },
  { to: "/admin/settings", label: "সেটিংস", Icon: Settings },
];

function AdminLayout() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      setState(isAdmin ? "ok" : "denied");
    })();
  }, [navigate]);

  if (state === "loading") return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">লোড হচ্ছে...</div>;
  if (state === "denied") return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">অনুমতি নেই</h1>
        <p className="mt-2 text-sm text-muted-foreground">এই পেজ দেখার জন্য অ্যাডমিন অনুমতি প্রয়োজন।</p>
        <p className="mt-4 text-xs text-muted-foreground">অ্যাডমিন বানাতে: Supabase → user_roles টেবিলে আপনার user_id দিয়ে role='admin' যোগ করুন।</p>
        <Link to="/" className="mt-6 inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm">হোমে ফিরুন</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-background">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-lg font-semibold text-primary">মেডিকেয়ার</span>
          <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, Icon, exact }) => {
            const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 h-10 rounded-md text-sm hover:bg-muted"><Store className="h-4 w-4" /> স্টোরফ্রন্ট</Link>
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} className="w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm hover:bg-muted text-destructive">
            <LogOut className="h-4 w-4" /> লগআউট
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border flex">
        {nav.map(({ to, Icon, label, exact }) => {
          const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
          return (
            <Link key={to} to={to} className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
