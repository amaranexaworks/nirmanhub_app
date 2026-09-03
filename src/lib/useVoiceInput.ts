import { useCallback, useRef, useState } from 'react';
import { useUiStore } from '@stores/uiStore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

/**
 * Voice input via the Web Speech API. Language follows the app setting
 * (Telugu → te-IN, English → en-IN). No-ops gracefully where unsupported.
 * For native Android, swap in @capacitor-community/speech-recognition.
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const language = useUiStore((s) => s.language);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!SR) return;
    try {
      const rec = new SR();
      rec.lang = language === 'te' ? 'te-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.onresult = (e: any) => {
        const text = e?.results?.[0]?.[0]?.transcript ?? '';
        if (text) onResult(text);
      };
      recRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
    }
  }, [language, onResult]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  return { listening, supported: !!SR, start, stop };
}
