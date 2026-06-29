import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playPing } from "@/lib/chat-sound";
import { MessageCircle, Send, X } from "lucide-react";

const SESSION_KEY = "medi-chat-session";
const TOKEN_KEY = "medi-chat-token";
const USER_KEY = "medi-chat-user";

type Msg = { id: string; sender: string; body: string; created_at: string };

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ name: "", username: "" });
  const [unread, setUnread] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem(SESSION_KEY);
    const tok = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (sid && tok && u) {
      setSessionId(sid);
      setToken(tok);
      setUser(JSON.parse(u));
    }
  }, []);

  // Poll messages (realtime unavailable for anon since SELECT is admin-only)
  useEffect(() => {
    if (!sessionId || !token) return;
    let stopped = false;

    const load = async () => {
      const { data, error } = await supabase.rpc("get_chat_messages", {
        p_session_id: sessionId,
        p_access_token: token,
      });
      if (stopped || error || !data) return;
      const list = data as Msg[];
      setMessages((cur) => {
        // detect new admin/system messages for ping + unread
        const prevLastId = lastSeenIdRef.current;
        if (prevLastId) {
          const newOnes = list.slice(list.findIndex((m) => m.id === prevLastId) + 1);
          for (const m of newOnes) {
            if (m.sender === "admin" || m.sender === "system") {
              playPing();
              if (!open) setUnread((n) => n + 1);
            }
          }
        }
        lastSeenIdRef.current = list[list.length - 1]?.id ?? null;
        return list;
      });
    };

    load();
    const iv = setInterval(load, 3500);
    return () => { stopped = true; clearInterval(iv); };
  }, [sessionId, token, open]);

  useEffect(() => {
    if (open) setUnread(0);
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;
    const welcome = `স্বাগতম ${form.name}! আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে। আপনার প্রশ্ন লিখুন।`;
    const { data, error } = await supabase.rpc("start_chat_session", {
      p_name: form.name.trim(),
      p_username: form.username.trim(),
      p_welcome: welcome,
    });
    if (error || !data || !data[0]) return;
    const { session_id, access_token } = data[0] as { session_id: string; access_token: string };
    localStorage.setItem(SESSION_KEY, session_id);
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify({ name: form.name, username: form.username }));
    setSessionId(session_id);
    setToken(access_token);
    setUser({ name: form.name, username: form.username });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || !token) return;
    const body = input.trim();
    setInput("");
    await supabase.rpc("post_chat_message", {
      p_session_id: sessionId,
      p_access_token: token,
      p_body: body,
    });
    // optimistic refresh
    const { data } = await supabase.rpc("get_chat_messages", {
      p_session_id: sessionId,
      p_access_token: token,
    });
    if (data) {
      const list = data as Msg[];
      lastSeenIdRef.current = list[list.length - 1]?.id ?? null;
      setMessages(list);
    }
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
