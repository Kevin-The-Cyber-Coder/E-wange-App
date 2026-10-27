import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Mic, MicOff, Volume2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpeech } from "@/hooks/useSpeech";
import { useAuth } from "@/hooks/useAuth";
import { database, ref, set } from "@/lib/firebase";
import type { HomeData } from "@/hooks/useFirebaseData";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatBotProps {
  homeData: HomeData;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

// Quick command matching for instant execution
const QUICK_COMMANDS: { patterns: RegExp[]; key: string; value: string; response: string }[] = [
  { patterns: [/\blamp\s*(on|open)\b/i, /\bturn\s*on\s*(the\s*)?lamp\b/i, /\blight\s*(on)\b/i], key: "lamp", value: "ON", response: "💡 Lamp ON." },
  { patterns: [/\blamp\s*(off|close)\b/i, /\bturn\s*off\s*(the\s*)?lamp\b/i, /\blight\s*(off)\b/i], key: "lamp", value: "OFF", response: "💡 Lamp OFF." },
  { patterns: [/\bfan\s*(on|open)\b/i, /\bturn\s*on\s*(the\s*)?fan\b/i], key: "fan", value: "ON", response: "🌀 Fan ON." },
  { patterns: [/\bfan\s*(off|close)\b/i, /\bturn\s*off\s*(the\s*)?fan\b/i], key: "fan", value: "OFF", response: "🌀 Fan OFF." },
  { patterns: [/\bcurtain(s)?\s*(open)\b/i, /\bopen\s*(the\s*)?curtain/i], key: "curtains", value: "Open", response: "🪟 Curtains opened." },
  { patterns: [/\bcurtain(s)?\s*(close|closed)\b/i, /\bclose\s*(the\s*)?curtain/i], key: "curtains", value: "Closed", response: "🪟 Curtains closed." },
  { patterns: [/\bcurtain(s)?\s*(partial|half)\b/i], key: "curtains", value: "Partial", response: "🪟 Curtains partial." },
  { patterns: [/\bwater\s*pump\s*(on)\b/i, /\bpump\s*(on)\b/i, /\bturn\s*on\s*(the\s*)?pump\b/i], key: "water_pump", value: "ON", response: "💧 Water pump ON." },
  { patterns: [/\bwater\s*pump\s*(off)\b/i, /\bpump\s*(off)\b/i, /\bturn\s*off\s*(the\s*)?pump\b/i], key: "water_pump", value: "OFF", response: "💧 Water pump OFF." },
  { patterns: [/\b(open|raise)\s*(the\s*)?(parking\s*)?gate\b/i, /\bgate\s*(open|up)\b/i], key: "parking_gate", value: "Open", response: "🚗 Gate opened." },
  { patterns: [/\b(close|lower)\s*(the\s*)?(parking\s*)?gate\b/i, /\bgate\s*(close|closed|down)\b/i], key: "parking_gate", value: "Closed", response: "🚗 Gate closed." },
  { patterns: [/\bbuzzer\s*(on)\b/i], key: "buzzer", value: "ON", response: "🔔 Buzzer ON." },
  { patterns: [/\bbuzzer\s*(off)\b/i], key: "buzzer", value: "OFF", response: "🔔 Buzzer OFF." },
];

// Quick status queries
const STATUS_QUERIES: { patterns: RegExp[]; getResponse: (d: HomeData) => string }[] = [
  { patterns: [/\btemp(erature)?\s*(status|reading|now|check)?\b/i, /\bhow\s*hot\b/i], getResponse: (d) => `🌡️ ${d.temperature}°C, ${d.humidity}% humidity.` },
  { patterns: [/\bhumidity\s*(status|reading|level)?\b/i], getResponse: (d) => `💧 Humidity: ${d.humidity}%.` },
  { patterns: [/\bgas\s*(status|sensor|level|reading)?\b/i], getResponse: (d) => d.gas === "NO" ? "✅ Gas: Safe." : `⚠️ Gas detected: ${d.gas}!` },
  { patterns: [/\bparking\s*(status|slots?|available)?\b/i], getResponse: (d) => `🅿️ Slot1: ${d.parking.slot1.status}, Slot2: ${d.parking.slot2.status}, Gate: ${d.parking.gate}.` },
  { patterns: [/\bmain\s*door\s*(status|state)?\b/i, /\bis\s*(the\s*)?main\s*door\b/i, /\bdoor\s*(status|state)?\b/i], getResponse: (d) => `🚪 Main door: ${d.main_door.door_state} (${d.main_door.access})${d.main_door.user_name ? ` — ${d.main_door.user_name}` : ""}.` },
];

function tryQuickCommand(text: string, role: string, homeData: HomeData): { response: string; action?: { key: string; value: string } } | null {
  // Check status queries first
  for (const q of STATUS_QUERIES) {
    if (q.patterns.some((p) => p.test(text))) {
      return { response: q.getResponse(homeData) };
    }
  }

  // Check device commands
  if (role !== "admin") return null;
  for (const cmd of QUICK_COMMANDS) {
    if (cmd.patterns.some((p) => p.test(text))) {
      return { response: cmd.response, action: { key: cmd.key, value: cmd.value } };
    }
  }
  return null;
}

function parseActions(text: string): { key: string; value: string }[] {
  const actions: { key: string; value: string }[] = [];
  const regex = /:::ACTION:::(.*?):::END:::/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { actions.push(JSON.parse(match[1])); } catch {}
  }
  return actions;
}

function cleanMessage(text: string): string {
  return text.replace(/:::ACTION:::.*?:::END:::/gs, "").trim();
}

export function ChatBot({ homeData }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<"success" | "error" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useSpeech();
  const { user, role } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // Clear feedback after animation
  useEffect(() => {
    if (commandFeedback) {
      const t = setTimeout(() => setCommandFeedback(null), 1200);
      return () => clearTimeout(t);
    }
  }, [commandFeedback]);

  const executeActions = useCallback((actions: { key: string; value: string }[]) => {
    for (const action of actions) {
      set(ref(database, `/${action.key}`), action.value);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      if (!user) {
        toast({ title: "Please log in", description: "Authentication required.", variant: "destructive" });
        return;
      }

      const userMsg: Message = { role: "user", content: text };

      // Try quick command first for instant response
      const quick = tryQuickCommand(text, role, homeData);
      if (quick) {
        const assistantMsg: Message = { role: "assistant", content: quick.response };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput("");

        if (quick.action) {
          executeActions([quick.action]);
          setCommandFeedback("success");
          sonnerToast.success(quick.response);
        }

        if (voiceMode) speak(quick.response);
        return;
      }

      // Fall through to AI for complex queries
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      let assistantText = "";
      const upsert = (chunk: string) => {
        assistantText += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
          }
          return [...prev, { role: "assistant", content: assistantText }];
        });
      };

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })), homeData, userRole: role }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Request failed" }));
          toast({ title: "Error", description: err.error, variant: "destructive" });
          setCommandFeedback("error");
          setIsLoading(false);
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { done: d, value } = await reader.read();
          if (d) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsert(content);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        const actions = parseActions(assistantText);
        if (actions.length > 0) {
          executeActions(actions);
          setCommandFeedback("success");
          sonnerToast.success("Command executed");
        }

        if (voiceMode && assistantText) speak(assistantText);
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to get response.", variant: "destructive" });
        setCommandFeedback("error");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, user, homeData, role, voiceMode, speak, executeActions, toast]
  );

  const handleVoiceInput = useCallback(async () => {
    if (isListening) { stopListening(); return; }
    if (isSpeaking) { stopSpeaking(); return; }
    try {
      const transcript = await startListening();
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    } catch (err: any) {
      toast({ title: "Voice Error", description: err.message, variant: "destructive" });
      setCommandFeedback("error");
    }
  }, [isListening, isSpeaking, startListening, stopListening, stopSpeaking, sendMessage, toast]);

  // Mic button glow color
  const micGlowClass = isListening
    ? "bg-destructive/15 text-destructive animate-pulse shadow-[0_0_16px_hsl(var(--destructive)/0.4)]"
    : commandFeedback === "success"
    ? "bg-success/15 text-success shadow-[0_0_16px_hsl(var(--success)/0.4)]"
    : commandFeedback === "error"
    ? "bg-destructive/15 text-destructive shadow-[0_0_16px_hsl(var(--destructive)/0.4)]"
    : "text-muted-foreground hover:text-foreground";

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] sm:max-w-[calc(100vw-2rem)] h-[100dvh] sm:h-[540px] sm:max-h-[calc(100vh-4rem)] flex flex-col sm:rounded-2xl border overflow-hidden"
            style={{ background: "hsl(225 20% 8% / 0.95)", borderColor: "hsl(225 15% 20% / 0.5)", backdropFilter: "blur(24px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">E-wange AI</h3>
                  <p className="text-[10px] text-muted-foreground">Voice & Text Control</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${voiceMode ? "bg-primary/15 text-primary" : ""}`} onClick={() => setVoiceMode(!voiceMode)}>
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Hi! I'm E-wange AI</p>
                  <p className="text-xs text-muted-foreground mb-4">Say a command or ask a question</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Lamp on", "Fan off", "Temperature", "Gate open"].map((q) => (
                      <button key={q} onClick={() => sendMessage(q)} className="px-3 py-1.5 rounded-xl text-[11px] bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>p]:leading-relaxed">
                          <ReactMarkdown>{cleanMessage(msg.content)}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex gap-1 px-3 py-2 rounded-2xl bg-secondary rounded-bl-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border/50">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 items-center">
                <Button type="button" variant="ghost" size="icon" onClick={handleVoiceInput}
                  className={`h-9 w-9 rounded-xl flex-shrink-0 transition-all ${micGlowClass}`}>
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={isListening ? "Listening..." : "Say a command..."} className="flex-1 h-9 rounded-xl bg-secondary border-border/50 text-sm" disabled={isListening || isLoading} />
                <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 rounded-xl flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {isListening && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 mt-2">
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-destructive" />
                  <p className="text-[10px] text-destructive">Listening... tap to stop</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
