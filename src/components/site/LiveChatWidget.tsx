import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playPing } from "@/lib/chat-sound";
import { MessageCircle, Send, X } from "lucide-react";

const SESSION_KEY = "medi-chat-session";
const USER_KEY = "medi-chat-user";

type Msg = { id: string; sender: "user" | "admin" | "system"; body: string; created_at: string };

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ name: "", username: "" });
  const [unread, setUnread] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = localStorage.getItem(SESSION_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (sid && u) {
      setSessionId(sid);
      setUser(JSON.parse(u));
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at").then(({ data }) => {
      setMessages((data ?? []) as Msg[]);
    });
    const ch = supabase
      .channel(`chat-user-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const m = payload.new as Msg;
        setMessages((cur) => [...cur, m]);
        if (m.sender === "admin" || m.sender === "system") {
          if (!open) setUnread((n) => n + 1);
          playPing();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, open]);

  useEffect(() => {
    if (open) setUnread(0);
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;
    const { data, error } = await supabase.from("chat_sessions").insert({
      user_name: form.name.trim(),
      username: form.username.trim(),
      unread_admin: 1,
    }).select().single();
    if (error || !data) return;
    localStorage.setItem(SESSION_KEY, data.id);
    localStorage.setItem(USER_KEY, JSON.stringify({ name: form.name, username: form.username }));
    setSessionId(data.id);
    setUser({ name: form.name, username: form.username });
    await supabase.from("chat_messages").insert({
      session_id: data.id,
      sender: "system",
      body: `স্বাগতম ${form.name}! আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে। আপনার প্রশ্ন লিখুন।`,
    });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;
    const body = input.trim();
    setInput("");
    await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "user", body });
    const { data: sess } = await supabase.from("chat_sessions").select("unread_admin").eq("id", sessionId).single();
    await supabase.from("chat_sessions").update({
      last_message_at: new Date().toISOString(),
      unread_admin: (sess?.unread_admin ?? 0) + 1,
    }).eq("id", sessionId);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 md:bottom-6 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
        aria-label="লাইভ চ্যাট"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[480px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground">
            <div className="font-semibold text-sm">লাইভ সাপোর্ট</div>
            <div className="text-[11px] opacity-80">{user ? `${user.name}` : "নতুন কথোপকথন শুরু করুন"}</div>
          </div>

          {!sessionId ? (
            <form onSubmit={start} className="flex-1 p-5 flex flex-col gap-3">
              <label className="text-xs">
                <span className="font-medium block mb-1">আপনার নাম</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 border border-input rounded-md text-sm" required />
              </label>
              <label className="text-xs">
                <span className="font-medium block mb-1">ইউজারনেম / মোবাইল</span>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full h-10 px-3 border border-input rounded-md text-sm" required />
              </label>
              <button type="submit" className="mt-auto h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium">চ্যাট শুরু করুন</button>
            </form>
          ) : (
            <>
              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-sm" :
                      m.sender === "system" ? "bg-amber-500/10 text-amber-900 border border-amber-500/30" :
                      "bg-background border border-border rounded-bl-sm"
                    }`}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="মেসেজ লিখুন..." className="flex-1 h-10 px-3 border border-input rounded-md text-sm" />
                <button type="submit" className="h-10 w-10 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
