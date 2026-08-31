import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

const CATEGORIES = [
  { id: '',         label: 'All'       },
  { id: 'general',  label: 'General'   },
  { id: 'strategy', label: 'Strategy'  },
  { id: 'meta',     label: 'Meta'      },
  { id: 'help',     label: 'Help'      },
  { id: 'offtopic', label: 'Off-Topic' },
];
const SORTS = [
  { id: 'hot',       label: '🔥 Hot'           },
  { id: 'new',       label: '✨ New'            },
  { id: 'top',       label: '▲ Top'            },
  { id: 'discussed', label: '💬 Most Replied'   },
];
const CAT_COLORS = {
  general:  'bg-neutral-800 text-neutral-400 border-neutral-700',
  strategy: 'bg-teal-950/60 text-teal-400 border-teal-900/50',
  meta:     'bg-amber-950/60 text-amber-400 border-amber-900/50',
  help:     'bg-blue-950/60 text-blue-400 border-blue-900/50',
  offtopic: 'bg-purple-950/60 text-purple-400 border-purple-900/50',
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function HotCard({ thread, rank }) {
  return (
    <Link to={`/forums/${thread._id}`}
      className="relative bg-neutral-900 border border-neutral-800 hover:border-teal-500/40 hover:-translate-y-1 hover:shadow-press rounded-2xl p-5 flex flex-col gap-3 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <span className="w-6 h-6 rounded-full bg-black/60 border border-neutral-700 flex items-center justify-center text-[10px] font-black text-teal-400 shrink-0">
          #{rank}
        </span>
        {thread.category && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CAT_COLORS[thread.category] ?? CAT_COLORS.general}`}>
            {thread.category}
          </span>
        )}
      </div>
      <h3 className="font-black text-sm text-neutral-100 group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
        {thread.title}
      </h3>
      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed flex-1">{thread.body}</p>
      <div className="flex items-center gap-4 pt-3 border-t border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 text-xs">▲</span>
          <span className="font-mono font-bold text-sm text-amber-400">{thread.upvotes?.length ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-teal-500 text-xs">💬</span>
          <span className="font-mono font-bold text-sm text-teal-400">{thread.replyCount ?? 0}</span>
        </div>
        <span className="ml-auto text-[11px] text-neutral-600">{timeAgo(thread.createdAt)}</span>
      </div>
    </Link>
  );
}

function ThreadRow({ thread, index }) {
  return (
    <Link to={`/forums/${thread._id}`}
      className="flex items-stretch bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80 rounded-xl overflow-hidden transition-all group">

      <div className="w-11 shrink-0 flex items-center justify-center bg-neutral-950 border-r border-neutral-800">
        <span className="text-[11px] font-black tabular-nums text-neutral-700 group-hover:text-neutral-500 transition-colors">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center px-4 py-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden relative">
          {thread.author?.avatar
            ? <img src={thread.author.avatar} alt={thread.author.name} className="absolute inset-0 w-full h-full object-cover" />
            : <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-teal-400">
                {thread.author?.name?.charAt(0).toUpperCase()}
              </span>
          }
        </div>
      </div>

      <div className="flex-1 py-3 pr-3 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {thread.pinned && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-teal-950/60 text-teal-400 border border-teal-900/40">
              📌 Pinned
            </span>
          )}
          {thread.locked && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
              🔒 Locked
            </span>
          )}
          {thread.category && (
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full border ${CAT_COLORS[thread.category] ?? CAT_COLORS.general}`}>
              {thread.category}
            </span>
          )}
        </div>
        <h3 className="font-bold text-neutral-100 group-hover:text-teal-300 transition-colors text-sm truncate leading-snug">
          {thread.title}
        </h3>
        <p className="text-[11px] text-neutral-600 mt-0.5">
          by <span className="text-neutral-500">{thread.author?.name ?? 'Unknown'}</span>
          {' · '}{timeAgo(thread.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-5 px-5 border-l border-neutral-800 shrink-0">
        <div className="text-center hidden sm:block">
          <p className="font-mono font-bold text-sm text-amber-400 leading-none">{thread.upvotes?.length ?? 0}</p>
          <p className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">votes</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-bold text-sm text-teal-400 leading-none">{thread.replyCount ?? 0}</p>
          <p className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">replies</p>
        </div>
      </div>
    </Link>
  );
}

export default function ForumsPage() {
  const [threads, setThreads] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('hot');
  const [cat,     setCat]     = useState('');

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ sort });
    if (search) p.set('search', search);
    if (cat)    p.set('category', cat);
    api.get(`/forums/threads?${p}`)
      .then(r => { setThreads(r.data.threads ?? []); setTotal(r.data.total ?? 0); })
      .catch(() => { setThreads([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, sort, cat]);

  const hotTop3 = [...threads]
    .sort((a, b) => (b.upvotes?.length ?? 0) + (b.replyCount ?? 0) * 2 - ((a.upvotes?.length ?? 0) + (a.replyCount ?? 0) * 2))
    .slice(0, 3);

  const totalReplies = threads.reduce((s, t) => s + (t.replyCount ?? 0), 0);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 font-sans">

      {/* Header */}
      <div className="relative overflow-hidden px-4 sm:px-8 pt-12 pb-10 border-b border-neutral-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(20,184,166,0.09),transparent)]" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="ribbon text-sm mb-4">Community Discussion</span>
              <h1 className="font-display text-5xl sm:text-6xl text-neutral-100 leading-none">
                Community <span className="text-amber-400">Forums</span>
              </h1>
              <p className="text-sm text-neutral-500 mt-1.5 max-w-lg">
                Talk strategy, ask questions, share opinions — discuss anything Deadlock.
              </p>
            </div>
            <Link to="/forums/create"
              className="shrink-0 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black px-5 py-2.5 rounded-xl transition-all text-sm tracking-wide active:scale-95">
              + New Thread
            </Link>
          </div>

          {!loading && (
            <div className="flex flex-wrap gap-8 mt-8">
              {[
                { val: total,        label: 'Threads'      },
                { val: totalReplies, label: 'Total Replies' },
              ].map(s => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <span className="font-display text-2xl text-teal-400">{s.val}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto space-y-10">

        {/* Hot Topics */}
        {!loading && hotTop3.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">🔥 Trending</span>
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-[10px] text-neutral-600">Top 3 by activity</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {hotTop3.map((t, i) => <HotCard key={t._id} thread={t} rank={i + 1} />)}
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="space-y-3">
          {/* Sort tabs */}
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-0.5">
              {SORTS.map(s => (
                <button key={s.id} onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    sort === s.id
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search threads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  cat === c.id
                    ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-700'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thread list */}
        {loading ? (
          <div className="text-center py-20 text-neutral-500 animate-pulse">Loading threads…</div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <p className="text-neutral-400 mb-3">No threads yet.</p>
            <Link to="/forums/create" className="text-teal-400 hover:underline text-sm font-bold">
              Start the first discussion →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-neutral-600 mb-3">{threads.length} thread{threads.length !== 1 ? 's' : ''}</p>
            {threads.map((t, i) => <ThreadRow key={t._id} thread={t} index={i} />)}
          </div>
        )}
      </div>
    </main>
  );
}
