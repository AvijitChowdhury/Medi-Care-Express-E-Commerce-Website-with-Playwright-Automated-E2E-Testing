import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { LogOut, Package, Star } from "lucide-react";

export const Route = createFileRoute("/_shop/account")({
  head: () => ({ meta: [{ title: "আমার অ্যাকাউন্ট — মেডিকেয়ার" }] }),
  component: Account,
});

const labels: Record<string, string> = {
  pending: "গৃহীত", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "বাতিল",
};

function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/login" }); return; }
      setUser(data.user);
      const [{ data: prof }, { data: ord }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
        supabase.from("orders").select("*").eq("user_id", data.user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(prof);
      setOrders(ord ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">স্বাগতম{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <button onClick={signOut} className="h-10 px-4 rounded-md border border-border text-sm inline-flex items-center gap-2">
          <LogOut className="h-4 w-4" /> লগআউট
        </button>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> আমার অর্ডার</h2>
        {orders.length === 0 ? (
          <div className="mt-6 bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
            এখনো কোনো অর্ডার নেই। <Link to="/products" className="text-primary hover:underline">পণ্য দেখুন</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="block bg-card border border-border rounded-xl p-5 hover:border-primary transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString("bn-BD")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{taka(o.total)}</div>
                    <div className="text-xs mt-1 inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-full">{labels[o.status] ?? o.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
