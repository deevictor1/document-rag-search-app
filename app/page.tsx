'use client';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Navigation from './components/Navigation';

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?\n([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+] |\d+\. )/gm, '')
    .replace(/[*_~]/g, '')
    .trim();
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const browserWindow = window as SpeechWindow;
    setSpeechSupported(Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleSearch = async (question = query) => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    setVoiceMessage('');
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question.trim() })
      });
      const data = await res.json();
      if (data.error) {
        setAnswer(`Error: ${data.error}`);
      } else {
        setAnswer(data.answer || 'No answer generated');
        setSources(data.sources || []);
      }
    } catch (error: any) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as SpeechWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage('Speech recognition is not supported by this browser.');
      return;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setVoiceMessage('');
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      if (transcript) {
        setQuery(transcript);
        void handleSearch(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceMessage('Microphone or speech access was blocked. Check this site’s microphone permission and try again.');
      } else if (event.error === 'network') {
        setVoiceMessage('The browser speech service could not connect. Check your internet connection, disable VPN or network blocking temporarily, or try Chrome or Edge. You can also type your question instead.');
      } else if (event.error === 'no-speech') {
        setVoiceMessage('No speech was detected. Try again and speak clearly after the microphone starts.');
      } else {
        setVoiceMessage(`Speech recognition error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceMessage('Could not start speech recognition. Please try again.');
    }
  };

  const toggleAnswerAudio = () => {
    if (!('speechSynthesis' in window)) {
      setVoiceMessage('Spoken playback is not supported by this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(answer));
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navigation />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Your document workspace</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Ask your documents<span className="text-cyan-300">.</span></h1>
          <p className="mt-4 text-base leading-7 text-slate-400">Get clear answers grounded in the files you’ve uploaded.</p>
        </div>

        <section aria-label="Ask a question" className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 sm:p-6">
          <label htmlFor="question" className="mb-3 block text-sm font-medium text-slate-200">Your question</label>
          <textarea
            id="question"
            spellCheck={false}
            className="min-h-36 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-base leading-7 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
            placeholder="For example: What does the report say about customer growth?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
            onClick={() => void handleSearch()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-950" />Searching</>
              ) : (
                <><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m18 2-7.2 16-2.1-6.7L2 9.2 18 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="m8.7 11.3 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Search documents</>
              )}
            </button>
            <button
              onClick={toggleListening}
              disabled={!speechSupported || loading}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${isListening ? 'border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15' : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800'}`}
              title={!speechSupported ? 'Speech recognition is not supported in this browser' : undefined}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><rect x="7" y="2.5" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {isListening ? 'Stop listening' : 'Ask by voice'}
            </button>
            <span className="text-xs text-slate-500 sm:ml-auto">⌘ / Ctrl + Enter</span>
          </div>
          {isListening && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />Listening for your question…</p>}
          {voiceMessage && <p role="status" className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm leading-6 text-amber-100">{voiceMessage}</p>}
        </section>

        {answer && (
          <section aria-labelledby="answer-heading" className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg sm:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 2.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
                <div><h2 id="answer-heading" className="font-semibold text-white">Answer</h2><p className="text-xs text-slate-500">Generated from your documents</p></div>
              </div>
            {!answer.startsWith('Error:') && (
              <button
                onClick={toggleAnswerAudio}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
              >
                  {isSpeaking ? <><span className="h-2.5 w-2.5 rounded-sm bg-rose-300"/>Stop audio</> : <><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M3 8v4h3l4 3V5L6 8H3Zm10-1.5a5 5 0 0 1 0 7m2-9a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Play answer aloud</>}
              </button>
            )}
            </div>
            <div className="space-y-4 text-[15px] leading-7 text-slate-200 [&_a]:text-cyan-300 [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-300/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_code]:rounded [&_code]:bg-slate-950 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-cyan-200 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:whitespace-pre-wrap [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-sm [&_strong]:font-semibold [&_strong]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </section>
        )}

        {sources && sources.length > 0 && (
          <section aria-labelledby="sources-heading" className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 id="sources-heading" className="font-semibold text-white">Sources</h2><p className="mt-1 text-xs text-slate-500">Reference passages used for this answer</p></div>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                >
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium text-cyan-200">
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0"><path d="M5 2.5h6l4 4v11H5v-15Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M11 2.5v4h4M7.5 10h5M7.5 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    {source.metadata?.source || source.metadata?.file_name || 'Untitled document'}
                  </p>
                  <p className="line-clamp-4 text-sm leading-6 text-slate-400">
                    {source.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
