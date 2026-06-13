import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInput({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(text);
      if (e.results[0].isFinal) {
        onTranscript?.(text);
        setListening(false);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`relative p-3 rounded-full transition-colors ${listening ? 'bg-red-500 text-white voice-pulse' : 'bg-amazon-orange text-white hover:bg-amazon-orange-dark'}`}
        title={listening ? 'Stop listening' : 'Start voice input'}
      >
        {listening ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
      {transcript && (
        <span className="text-sm text-gray-600 italic truncate max-w-xs">"{transcript}"</span>
      )}
    </div>
  );
}
