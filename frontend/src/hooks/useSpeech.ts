import { useState, useCallback, useRef } from "react";

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error("Speech recognition not supported in this browser."));
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        reject(new Error(event.error));
      };

      recognition.onend = () => setIsListening(false);

      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      // Strip action blocks from spoken text
      const cleanText = text.replace(/:::ACTION:::.*?:::END:::/gs, "").trim();
      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      speechSynthesis.speak(utterance);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking };
}
