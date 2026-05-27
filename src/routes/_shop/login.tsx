import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_shop/login")({
  head: () => ({ meta: [{ title: "লগইন — মেডিকেয়ার" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/account" }); });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { emailRedirectTo: `${window.location.origin}/account`, data: { full_name: form.name } },
        });
        if (error) throw error;
        toast.success("অ্যাকাউন্ট তৈরি হয়েছে");
        navigate({ to: "/account" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("লগইন সফল");
        navigate({ to: "/account" });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="bg-card border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {mode === "signin" ? "লগইন করুন" : "অ্যাকাউন্ট খুলুন"}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Input label="পুরো নাম" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          )}
          <Input label="ইমেইল" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Input label="পাসওয়ার্ড" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          <button disabled={loading} className="w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {loading ? "অপেক্ষা করুন..." : mode === "signin" ? "লগইন" : "অ্যাকাউন্ট খুলুন"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <button onClick={() => setMode("signup")} className="text-primary hover:underline">নতুন অ্যাকাউন্ট খুলুন</button>
          ) : (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">আমার অ্যাকাউন্ট আছে — লগইন</button>
          )}
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          অ্যাকাউন্ট ছাড়াও <Link to="/products" className="text-primary hover:underline">গেস্ট হিসেবে অর্ডার</Link> করতে পারবেন
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium block mb-1.5">{label}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm" />
    </label>
  );
}
