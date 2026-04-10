import { useState, useCallback, useRef, useEffect } from 'react';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentCharIndex, setCurrentCharIndex] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Get best French voice
  const getFrenchVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() || [];
    // Prefer fr-CA, then fr-FR, then any fr
    return voices.find(v => v.lang === 'fr-CA')
        || voices.find(v => v.lang === 'fr-FR')
        || voices.find(v => v.lang.startsWith('fr'))
        || null;
  }, []);

  const speak = useCallback((text: string, rate = 1.0) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any previous

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getFrenchVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = 'fr-CA';
    utterance.rate = rate;

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        setCurrentCharIndex(e.charIndex);
      }
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentCharIndex(-1);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentCharIndex(-1);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setCurrentCharIndex(0);
    window.speechSynthesis.speak(utterance);
  }, [getFrenchVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setCurrentCharIndex(-1);
  }, []);

  // Refresh voices when they become available (Chrome loads them asynchronously)
  const [, setVoicesReady] = useState(0);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const handler = () => setVoicesReady(n => n + 1);
    synth.addEventListener('voiceschanged', handler);
    return () => {
      synth.removeEventListener('voiceschanged', handler);
      synth.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking, currentCharIndex };
}
