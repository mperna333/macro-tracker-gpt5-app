import { useEffect, useRef, useState } from 'react';

export default function SpeechMealInput({ onParsed }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (e) => setText(e.results[0][0].transcript);
    recog.onend = () => setListening(false);
    recognitionRef.current = recog;
    setSupported(true);
  }, []);

  const start = () => { recognitionRef.current?.start(); setListening(true); };
  const stop  = () => { recognitionRef.current?.stop();  setListening(false); };

  const submit = async () => {
    if (!text.trim()) return;
    const r = await fetch('/api/parse-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text }),
    });
    const data = await r.json();
    if (!r.ok) return alert(data?.error || 'Could not parse meal');
    onParsed({ source_text: text, ...data });
    setText('');
  };

  return (
    <div className="bg-purple4 p-4 rounded-2xl mb-4">
      <h2 className="text-lg mb-2">Add Meal by Voice</h2>
      <p className="text-sm opacity-80 mb-2">Try: “2 eggs, 1 cup oatmeal with peanut butter, a banana”.</p>

      <textarea
        className="w-full bg-purple3 p-3 rounded mb-2"
        rows={3}
        placeholder="Or type your meal here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={submit} className="bg-purple1 px-4 py-2 rounded hover:bg-purple2">Parse & Add</button>
        {supported && !listening && (
          <button onClick={start} className="bg-purple3 px-4 py-2 rounded hover:bg-purple2">🎤 Start</button>
        )}
        {supported && listening && (
          <button onClick={stop} className="bg-purple3 px-4 py-2 rounded hover:bg-purple2">■ Stop</button>
        )}
      </div>
    </div>
  );
}
