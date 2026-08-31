import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/*
 * The Archivist — a retrieval-augmented assistant.
 *
 * Answers stream in over server-sent events from POST /api/chat. The widget
 * tells the server which page the reader is on, so a question asked on a build
 * page resolves against that build.
 */

const SUGGESTIONS = [
  'What should I buy next?',
  'Which items counter burst damage?',
  'Explain this build\'s item order',
  'When should I rotate out of a losing lane?',
];

const SOURCE_LABEL = {
  item: 'Item', hero: 'Hero', build: 'Build',
  guide: 'Guide', thread: 'Thread', reply: 'Reply',
};

/* Minimal inline markdown: **bold** plus - bullets. The system prompt asks for
 * nothing heavier, so a full markdown dependency would not earn its weight. */
function renderText(text) {
  const lines = text.split('\n');
  const out = [];
  let bullets = [];

  const flush = () => {
    if (!bullets.length) return;
    out.push(
      <ul key={`u${out.length}`} className="list-disc pl-4 space-y-1 my-1.5">
        {bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) { bullets.push(m[1]); return; }
    flush();
    if (line.trim()) out.push(<p key={`p${i}`} className="my-1.5">{inline(line)}</p>);
  });
  flush();
  return out;
}

function inline(s) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-teal-300 font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

export default function ChatWidget() {
  const location = useLocation();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [status, setStatus]     = useState(null);
  const bottomRef = useRef(null);
  const abortRef  = useRef(null);

  // What the reader is looking at right now, so the answer can be about it.
  const context = useMemo(() => {
    const p = location.pathname;
    let buildId = null, hero = null, page = 'the site';
    let m;
    if ((m = p.match(/^\/builds\/([0-9a-fA-F]{24})$/))) { buildId = m[1]; page = 'a build page'; }
    else if ((m = p.match(/^\/heroes\/([^/]+)$/)))      { hero = decodeURIComponent(m[1]); page = `the ${hero} hero page`; }
    else if (p.startsWith('/builds/create'))             page = 'the build calculator';
    else if (p.startsWith('/builds'))                    page = 'the builds list';
    else if (p.startsWith('/forums'))                    page = 'the forums';
    else if (p.startsWith('/heroes'))                    page = 'the hero list';
    return { page, buildId, hero };
  }, [location.pathname]);

  useEffect(() => {
    if (!open || status) return;
    fetch('/api/chat/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ success: false, configured: false }));
  }, [open, status]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Leaving the page mid-answer should stop the request.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;

    setInput('');
    setBusy(true);

    const history = messages
      .filter(m => !m.error)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', sources: [], streaming: true },
    ]);

    const patchLast = (patch) => setMessages(prev => {
      const next = [...prev];
      const i = next.length - 1;
      next[i] = { ...next[i], ...(typeof patch === 'function' ? patch(next[i]) : patch) };
      return next;
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: question, history, ...context }),
      });

      // Errors before the stream opens come back as ordinary JSON.
      if (!res.ok && !res.headers.get('content-type')?.includes('text/event-stream')) {
        const body = await res.json().catch(() => ({}));
        patchLast({ content: body.error ?? `Request failed (${res.status})`, error: true, streaming: false });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          let evt;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === 'sources')      patchLast({ sources: evt.sources ?? [] });
          else if (evt.type === 'delta')   patchLast(m => ({ content: m.content + evt.text }));
          else if (evt.type === 'error')   patchLast({ content: evt.error, error: true, streaming: false });
          else if (evt.type === 'done')    patchLast({ streaming: false });
        }
      }
      patchLast(m => (m.streaming ? { streaming: false } : {}));
    } catch (e) {
      if (e.name !== 'AbortError') {
        patchLast({ content: 'Could not reach the assistant. Is the server running?', error: true, streaming: false });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  const unavailable = status && !status.configured;
  const emptyIndex  = status?.configured && status.index?.total === 0;

  return (
    <>
      {/* Launcher sits bottom-LEFT: the tawk.to live-support widget in
          client/index.html already owns the bottom-right corner. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close the Archivist' : 'Ask the Archivist'}
        className="fixed bottom-5 left-5 z-40 h-14 w-14 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950
                   shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all active:scale-95"
      >
        {open
          ? <span className="text-2xl leading-none font-light">×</span>
          : <span className="text-xl leading-none">◈</span>}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-40 w-[min(26rem,calc(100vw-2.5rem))] h-[min(34rem,calc(100vh-9rem))]
                        bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          <header className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <div>
              <p className="font-black text-sm tracking-tight">
                The <span className="text-teal-400">Archivist</span>
              </p>
              <p className="text-[10px] text-neutral-500">
                {status?.index?.total
                  ? `Grounded in ${status.index.total} passages from the Archive`
                  : 'Build and strategy assistant'}
              </p>
              {status?.model && (
                <p className="text-[9px] text-neutral-600 mt-0.5">
                  {status.provider === 'local' ? 'Running locally on ' : 'Answered by '}{status.model}
                </p>
              )}
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-300">
                Clear
              </button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-neutral-200">
            {unavailable && (
              <Notice tone="amber" title="Assistant unavailable">
                {status.reason ?? 'No generation backend is configured.'}
              </Notice>
            )}
            {emptyIndex && (
              <Notice tone="amber" title="Knowledge base is empty">
                Run <code className="text-amber-300">npm run ingest --prefix server</code> to build the index.
              </Notice>
            )}

            {messages.length === 0 && !unavailable && (
              <div className="text-neutral-400 space-y-3">
                <p>
                  Ask about builds, items, or strategy. Answers are drawn from this site&apos;s
                  item catalogue, published builds and forum discussion.
                </p>
                <div className="space-y-1.5 pt-1">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} disabled={busy}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800
                                 hover:border-teal-500/40 hover:text-teal-300 transition-colors disabled:opacity-40">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end mb-3' : 'mb-4'}>
                {m.role === 'user' ? (
                  <p className="bg-teal-500/10 border border-teal-500/25 text-teal-100 rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]">
                    {m.content}
                  </p>
                ) : (
                  <div>
                    {m.error ? (
                      <p className="text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">{m.content}</p>
                    ) : (
                      <div className="leading-relaxed">
                        {renderText(m.content)}
                        {m.streaming && !m.content && (
                          <span className="inline-flex gap-1 py-1">
                            {[0, 1, 2].map(d => (
                              <span key={d} className="h-1.5 w-1.5 rounded-full bg-teal-400/70 animate-pulse"
                                style={{ animationDelay: `${d * 160}ms` }} />
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                    {!m.error && !m.streaming && m.sources?.length > 0 && <Sources items={m.sources} />}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            className="p-3 border-t border-neutral-800 flex gap-2 shrink-0"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={busy || unavailable}
              placeholder={context.buildId ? 'Ask about this build…' : 'Ask about builds or items…'}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm
                         focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600 disabled:opacity-50"
            />
            <button type="submit" disabled={busy || !input.trim() || unavailable}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-30 text-neutral-950 font-bold px-4 rounded-xl text-sm transition-colors">
              {busy ? '…' : 'Ask'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Notice({ tone, title, children }) {
  const c = tone === 'amber'
    ? 'bg-amber-950/30 border-amber-900/50 text-amber-200'
    : 'bg-neutral-900 border-neutral-800 text-neutral-300';
  return (
    <div className={`border rounded-xl px-3 py-2.5 mb-3 text-xs ${c}`}>
      <p className="font-bold mb-1">{title}</p>
      <p className="opacity-90 leading-relaxed">{children}</p>
    </div>
  );
}

function Sources({ items }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setShow(s => !s)}
        className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-teal-400 transition-colors">
        {show ? 'Hide' : 'Show'} sources ({items.length})
      </button>
      {show && (
        <ul className="mt-1.5 space-y-1">
          {items.map((s, i) => (
            <li key={i} className="text-xs">
              <a href={s.url || '#'}
                className="flex items-baseline gap-2 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-teal-500/30">
                <span className="text-[9px] uppercase tracking-wider text-neutral-500 shrink-0 w-11">
                  {SOURCE_LABEL[s.source] ?? s.source}
                </span>
                <span className="text-neutral-300 truncate">{s.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
