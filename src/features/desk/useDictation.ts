import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

let active: symbol | null = null;
/** OS recognition service; only the explicitly activated surface receives events. */
export function useDictation(onTranscript: (text: string) => void) {
  const [identity] = useState(() => Symbol('dictation'));
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);
  const mounted = useRef(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  useSpeechRecognitionEvent('result', (event) => {
    if (active !== identity) return;
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) { if (text.trim()) callback.current(text); setInterim(''); }
    else setInterim(text);
  });
  useSpeechRecognitionEvent('end', () => { if (active === identity) { active = null; setListening(false); } });
  useSpeechRecognitionEvent('error', (event) => {
    if (active === identity) { active = null; setListening(false); setError(event.message || event.error); }
  });
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false;
    if (active === identity) { active = null; ExpoSpeechRecognitionModule.abort(); }
  }; }, [identity]);
  async function toggle() {
    if (listening) { ExpoSpeechRecognitionModule.stop(); return; }
    setError(null); setInterim('');
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) throw new Error('Speech recognition unavailable on this device. Type instead.');
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) throw new Error('Microphone/speech permission denied. Type instead or allow it in system settings.');
      if (active) throw new Error('Another voice field is listening. Stop it first.');
      active = identity;
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
      setListening(true);
    } catch (e) { if (active === identity) active = null; if (mounted.current) { setError(String(e)); setListening(false); } }
  }
  return { listening, interim, error, toggle };
}
