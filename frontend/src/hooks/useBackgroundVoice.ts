import { useState, useCallback, useRef, useEffect } from "react";

interface UseBackgroundVoiceOptions {
  wakeWord?: string;
  onTranscript: (text: string) => void;
  enabled: boolean;
}

export function useBackgroundVoice({ wakeWord = "e-wange", onTranscript, enabled }: UseBackgroundVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimeout = useRef<ReturnType<typeof setTimeout>>();
  const manualStop = useRef(false);

  const startContinuousListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Clean up existing
    if (recognitionRef.current) {
      manualStop.current = true;
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      manualStop.current = false;
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (!transcript) continue;

          // If wake word is set, check for it
          if (wakeWord) {
            const lower = transcript.toLowerCase();
            if (lower.includes(wakeWord.toLowerCase())) {
              // Strip wake word and process the rest
              const command = lower.replace(new RegExp(wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
              if (command) onTranscript(command);
              else onTranscript(transcript); // Pass full if nothing after wake word
            } else {
              // No wake word — still process (for convenience)
              onTranscript(transcript);
            }
          } else {
            onTranscript(transcript);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are normal — just restart
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn("Voice recognition error:", event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart unless manually stopped
      if (!manualStop.current && enabled) {
        restartTimeout.current = setTimeout(() => {
          if (!manualStop.current && enabled) {
            startContinuousListening();
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Failed to start recognition:", e);
    }
  }, [wakeWord, onTranscript, enabled]);

  const stopListening = useCallback(() => {
    manualStop.current = true;
    clearTimeout(restartTimeout.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      const clean = text.replace(/:::ACTION:::.*?:::END:::/gs, "").replace(/[*#_`]/g, "").trim();
      if (!clean) { resolve(); return; }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      speechSynthesis.speak(utterance);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startContinuousListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, startContinuousListening, stopListening]);

  return { isListening, isSpeaking, speak, stopSpeaking, stopListening };
}
