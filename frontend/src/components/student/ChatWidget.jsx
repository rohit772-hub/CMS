import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2, Plus } from "lucide-react";
import api from "../../lib/api";

const STORAGE_KEY = "cms_chat_session";

/**
 * ChatWidget — floating bubble (bottom-right) that opens a full chat window.
 * Multi-turn, persisted on the server keyed by session_id (stored in localStorage).
 */
export default function ChatWidget({ context = "" }) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch (_) { return ""; }
  });
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  // Load history when widget opens for the first time with a saved session
  useEffect(() => {
    if (!open || !sessionId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/chat/history?session_id=${encodeURIComponent(sessionId)}`);
        if (mounted && Array.isArray(data.messages)) {
          setMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, [open, sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, open]);

  const send = async (e) => {
    e?.preventDefault?.();
    const msg = text.trim();
    if (!msg || busy) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setText(""); setBusy(true);
    try {
      const { data } = await api.post("/chat/send", { session_id: sessionId || undefined, message: msg, context });
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        try { localStorage.setItem(STORAGE_KEY, data.session_id); } catch (_) {}
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "(no reply)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach my brain just now. Please try again." }]);
    } finally { setBusy(false); }
  };

  const startNew = () => {
    setMessages([]); setSessionId("");
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  };

  return (
    <>
      {/* Floating button (sits above the Emergent badge at bottom-right) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Spark, your study buddy"
        data-testid="chat-fab"
        className="fixed right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-[#126b6e] to-[#0d3b3f] text-white ring-4 ring-[var(--cms-yellow)]/40 hover:scale-105 transition"
        style={{ bottom: "76px" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} /></motion.span>
          ) : (
            <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageCircle size={22} /></motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed right-6 z-[60] w-[min(96vw,380px)] h-[min(85vh,560px)] rounded-2xl overflow-hidden shadow-2xl bg-white border border-[#e3eeee] flex flex-col"
            style={{ bottom: "150px" }}
            data-testid="chat-window"
          >
            <header className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0d3b3f] to-[#126b6e] text-white">
              <div className="w-9 h-9 rounded-full bg-white/15 grid place-items-center"><Sparkles size={18} className="text-[var(--cms-yellow)]" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-base font-semibold leading-tight">Spark · Study Buddy</p>
                <p className="text-[11px] text-white/70 leading-tight">Powered by Gemini · ask me anything about your lessons</p>
              </div>
              <button onClick={startNew} className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10" title="Start new chat" data-testid="chat-new">
                <Plus size={16} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-[#f7fbfb]" data-testid="chat-scroll">
              {messages.length === 0 && (
                <div className="text-center text-[var(--cms-muted)] text-sm mt-8">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[var(--cms-teal-soft)] grid place-items-center mb-3"><Sparkles size={22} className="text-[var(--cms-teal)]" /></div>
                  <p className="font-semibold text-[var(--cms-teal-deep)]">Hi! I'm Spark.</p>
                  <p className="mt-1 text-xs">Ask me to explain a concept, solve a problem, or quiz you on what you're learning.</p>
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {["Explain photosynthesis", "What is a variable?", "Quiz me on fractions"].map((s) => (
                      <button key={s} onClick={() => setText(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-[#e3eeee] text-[var(--cms-teal-deep)] hover:bg-[var(--cms-teal-soft)]">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-snug ${m.role === "user" ? "bg-[var(--cms-teal)] text-white rounded-br-md" : "bg-white text-[var(--cms-teal-deep)] border border-[#e3eeee] rounded-bl-md"}`} data-testid={`chat-msg-${m.role}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-[#e3eeee] rounded-bl-md flex items-center gap-2 text-[var(--cms-muted)] text-sm">
                      <Loader2 size={14} className="animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={send} className="p-2.5 border-t border-[#e3eeee] bg-white flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your doubt…"
                className="flex-1 bg-[#f7fbfb] border border-[#e3eeee] rounded-full px-4 py-2.5 text-sm text-[var(--cms-teal-deep)] placeholder:text-[var(--cms-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cms-teal)]/40"
                data-testid="chat-input"
                disabled={busy}
                autoFocus
              />
              <button type="submit" disabled={busy || !text.trim()} className="w-10 h-10 rounded-full bg-[var(--cms-teal)] text-white grid place-items-center hover:bg-[var(--cms-teal-deep)] disabled:opacity-50 transition" data-testid="chat-send">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
