import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { useBackgroundVoice } from "@/hooks/useBackgroundVoice";
import { useAuth } from "@/hooks/useAuth";
import { database, ref, set, push } from "@/lib/firebase";
import type { HomeData } from "@/hooks/useFirebaseData";
import { toast } from "sonner";

interface VoiceAssistantProps {
  homeData: HomeData;
}

interface FeedbackItem {
  id: number;
  text: string;
  type: "command" | "status" | "error";
}

// Quick commands — same as ChatBot for consistency
const QUICK_COMMANDS: { patterns: RegExp[]; key: string; value: string; response: string }[] = [
  { patterns: [/\blamp\s*(on|open)\b/i, /\bturn\s*on\s*(the\s*)?lamp\b/i, /\blight\s*(on)\b/i], key: "lamp", value: "ON", response: "💡 Lamp turned ON." },
  { patterns: [/\blamp\s*(off|close)\b/i, /\bturn\s*off\s*(the\s*)?lamp\b/i, /\blight\s*(off)\b/i], key: "lamp", value: "OFF", response: "💡 Lamp turned OFF." },
  { patterns: [/\bfan\s*(on|open)\b/i, /\bturn\s*on\s*(the\s*)?fan\b/i], key: "fan", value: "ON", response: "🌀 Fan turned ON." },
  { patterns: [/\bfan\s*(off|close)\b/i, /\bturn\s*off\s*(the\s*)?fan\b/i], key: "fan", value: "OFF", response: "🌀 Fan turned OFF." },
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

const STATUS_QUERIES: { patterns: RegExp[]; getResponse: (d: HomeData) => string }[] = [
  { patterns: [/\btemp(erature)?\b/i, /\bhow\s*hot\b/i], getResponse: (d) => `Temperature is ${d.temperature}°C, humidity ${d.humidity}%.` },
  { patterns: [/\bhumidity\b/i], getResponse: (d) => `Humidity is ${d.humidity}%.` },
  { patterns: [/\bgas\b/i], getResponse: (d) => d.gasValue > 500 ? `Warning! Gas level is high at ${d.gasValue}.` : `Gas level is safe at ${d.gasValue}.` },
  { patterns: [/\bparking\b/i], getResponse: (d) => `Slot 1 ${d.parking.slot1.status}, Slot 2 ${d.parking.slot2.status}, Gate ${d.parking.gate}.` },
  { patterns: [/\bdoor\b/i, /\bmain\s*door\b/i], getResponse: (d) => `Main door is ${d.main_door.door_state}, access ${d.main_door.access}${d.main_door.user_name ? ` by ${d.main_door.user_name}` : ""}.` },
];

function logAction(userId: string, command: string, action: string) {
  const logRef = ref(database, "/activity_logs");
  push(logRef, {
    user_id: userId,
    command,
    action,
    timestamp: new Date().toISOString(),
  });
}

export function VoiceAssistant({ homeData }: VoiceAssistantProps) {
  const [enabled, setEnabled] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const feedbackId = useRef(0);
  const { user, role } = useAuth();
  const homeDataRef = useRef(homeData);
  homeDataRef.current = homeData;

  const addFeedback = useCallback((text: string, type: FeedbackItem["type"]) => {
    const id = ++feedbackId.current;
    setFeedbacks((prev) => [...prev.slice(-4), { id, text, type }]);
    // Auto-remove after 5s
    setTimeout(() => setFeedbacks((prev) => prev.filter((f) => f.id !== id)), 5000);
  }, []);

  const handleTranscript = useCallback((text: string) => {
    if (!user) return;

    // Check status queries
    for (const q of STATUS_QUERIES) {
      if (q.patterns.some((p) => p.test(text))) {
        const response = q.getResponse(homeDataRef.current);
        addFeedback(response, "status");
        speak(response);
        logAction(user.id, text, "status_query");
        return;
      }
    }

    // Check device commands (admin only)
    if (role === "admin") {
      for (const cmd of QUICK_COMMANDS) {
        if (cmd.patterns.some((p) => p.test(text))) {
          set(ref(database, `/${cmd.key}`), cmd.value);
          addFeedback(cmd.response, "command");
          speak(cmd.response);
          toast.success(cmd.response);
          logAction(user.id, text, `${cmd.key}=${cmd.value}`);
          return;
        }
      }
    } else {
      // Viewer tried a command
      for (const cmd of QUICK_COMMANDS) {
        if (cmd.patterns.some((p) => p.test(text))) {
          const msg = "Sorry, you don't have permission to control devices.";
          addFeedback(msg, "error");
          speak(msg);
          return;
        }
      }
    }

    // Unrecognized
    addFeedback(`Heard: "${text}"`, "status");
  }, [user, role, addFeedback]);

  // We need speak from the hook but also need to call it inside handleTranscript
  // So we use a ref pattern
  const speakRef = useRef<(text: string) => Promise<void>>();

  const { isListening, isSpeaking, speak: hookSpeak, stopSpeaking } = useBackgroundVoice({
    wakeWord: "",
    onTranscript: handleTranscript,
    enabled: enabled && !!user,
  });

  speakRef.current = hookSpeak;
  const speak = useCallback((text: string) => speakRef.current?.(text), []);

  // Dismiss single feedback
  const dismissFeedback = useCallback((id: number) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  }, []);

  if (!user) return null;

  return (
    <>
      {/* Toggle Button — fixed position, left side to not conflict with ChatBot FAB */}
      <motion.button
        onClick={() => setEnabled((v) => !v)}
        className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 border ${
          enabled
            ? "bg-primary/20 border-primary/40 shadow-[0_0_24px_hsl(var(--glow-primary))]"
            : "bg-secondary border-border hover:bg-secondary/80"
        }`}
        whileTap={{ scale: 0.9 }}
        title={enabled ? "Disable voice assistant" : "Enable voice assistant"}
      >
        {enabled ? (
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </motion.div>
        ) : (
          <MicOff className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        )}
      </motion.button>

      {/* Listening indicator ring */}
      <AnimatePresence>
        {enabled && isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full pointer-events-none"
          >
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border-2 border-primary/60"
            />
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
              className="absolute inset-0 rounded-full border-2 border-primary/40"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaking indicator */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[4.5rem] left-4 sm:bottom-[5.5rem] sm:left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md"
          >
            <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[11px] text-primary font-medium">Speaking...</span>
            <button onClick={stopSpeaking} className="ml-1 text-primary/60 hover:text-primary">
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback bubbles */}
      <div className="fixed bottom-20 sm:bottom-24 left-4 sm:left-6 z-50 flex flex-col gap-2 max-w-[280px] sm:max-w-[320px] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {feedbacks.map((fb) => (
            <motion.div
              key={fb.id}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`pointer-events-auto px-3 py-2 rounded-xl text-xs backdrop-blur-xl border cursor-pointer ${
                fb.type === "command"
                  ? "bg-success/10 border-success/30 text-success"
                  : fb.type === "error"
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-secondary/90 border-border/50 text-foreground"
              }`}
              onClick={() => dismissFeedback(fb.id)}
            >
              {fb.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
