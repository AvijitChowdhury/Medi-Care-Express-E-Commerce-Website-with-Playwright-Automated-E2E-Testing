import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { playPing } from "@/lib/chat-sound";
import { MessageCircle, Send } from "lucide-react";

export const Route = createFileRoute("/admin/chat")({
  component: AdminChatPage,
});

type Session = {
  id: string; user_name: string; username: string;
  last_message_at: string; unread_admin: number; created_at: string;
};
type Msg = { id: string; sender: "user" | "admin" | "system"; body: string; created_at: string };

async function fetchSessions(): Promise<Session[]> {
  const { data } = await supabase.from("chat_sessions").select("*").order("last_message_at", { ascending: false });
  return (data ?? []) as Session[];
}

function AdminChatPage() {
  const qc = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["admin", "chat-sessions"], queryFn: fetchSessions });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase
      .channel("admin-chat-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "chat-sessions"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as Msg & { session_id: string };
        if (m.sender === "user") playPing();
        if (m.session_id === activeId) setMessages((cur) => [...cur, m]);
        qc.invalidateQueries({ queryKey: ["admin", "chat-sessions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, activeId]);

  useEffect(() => {
    if (!activeId) return;
    supabase.from("chat_messages").select("*").eq("session_id", activeId).order("created_at").then(({ data }) => {
      setMessages((data ?? []) as Msg[]);
    });
    supabase.from("chat_sessions").update({ unread_admin: 0 }).eq("id", activeId).then(() => {
      qc.invalidateQueries({ queryKey: ["admin", "chat-sessions"] });
    });
  }, [activeId, qc]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    const body = input.trim();
    setInput("");
    await supabase.from("chat_messages").insert({ session_id: activeId, sender: "admin", body });
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", activeId);
  };

  const active = sessions?.find((s) => s.id === activeId);

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex">
      <aside className="w-72 shrink-0 border-r border-border bg-background overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> লাইভ চ্যাট</h1>
          <p className="text-[11px] text-muted-foreground mt-1">{(sessions ?? []).length} সক্রিয় কথোপকথন</p>
        </div>
        <div className="divide-y divide-border">
          {(sessions ?? []).map((s) => (
            <button key={s.id} onClick={() => setActiveId(s.id)}
              className={`w-full text-left p-3 hover:bg-muted/50 ${activeId === s.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate">{s.user_name}</div>
                {s.unread_admin > 0 && (
                  <span className="ml-2 shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">{s.unread_admin}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{s.username}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(s.last_message_at).toLocaleString("bn-BD")}</div>
            </button>
          ))}
          {(sessions ?? []).length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">কোনো কথোপকথন নেই</div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-muted/20 min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">একটি কথোপকথন নির্বাচন করুন</div>
        ) : (
          <>
            <div className="p-4 bg-background border-b border-border">
              <div className="font-semibold">{active.user_name}</div>
              <div className="text-xs text-muted-foreground">{active.username}</div>
            </div>
            <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                    m.sender === "admin" ? "bg-primary text-primary-foreground rounded-br-sm" :
                    m.sender === "system" ? "bg-amber-500/10 text-amber-900 border border-amber-500/30" :
                    "bg-background border border-border rounded-bl-sm"
                  }`}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="p-3 bg-background border-t border-border flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="উত্তর লিখুন..." className="flex-1 h-10 px-3 border border-input rounded-md text-sm" />
              <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2"><Send className="h-4 w-4" /> পাঠান</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
