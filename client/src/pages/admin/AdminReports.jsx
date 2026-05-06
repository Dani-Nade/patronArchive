import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';

function timeAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d < 7)   return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function AdminReports() {
  const [builds, setBuilds]     = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('builds');
  const [actionId, setActionId] = useState(null);
  const [toast, setToast]       = useState('');

  useEffect(() => {
    api.get('/admin/reports')
      .then(r => { setBuilds(r.data.builds ?? []); setComments(r.data.comments ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismissBuild = async (id) => {
    setActionId(id);
    try {
      await api.post(`/admin/reports/builds/${id}/dismiss`);
      setBuilds(prev => prev.filter(b => b._id !== id));
    } finally { setActionId(null); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const deleteBuild = async (id) => {
    if (!confirm('Permanently delete this build? This will also add a strike to the author.')) return;
    setActionId(id);
    try {
      const r = await api.delete(`/admin/reports/builds/${id}`);
      setBuilds(prev => prev.filter(b => b._id !== id));
      if (r.data.suspended) showToast(`User auto-suspended after ${r.data.strikes} strikes.`);
      else if (r.data.strikes) showToast(`Strike issued. User now has ${r.data.strikes}/3 strikes.`);
    } finally { setActionId(null); }
  };

  const dismissComment = async (id) => {
    setActionId(id);
    try {
      await api.post(`/admin/reports/comments/${id}/dismiss`);
      setComments(prev => prev.filter(c => c._id !== id));
    } finally { setActionId(null); }
  };

  const deleteComment = async (id) => {
    if (!confirm('Permanently delete this comment? This will also add a strike to the author.')) return;
    setActionId(id);
    try {
      const r = await api.delete(`/admin/reports/comments/${id}`);
      setComments(prev => prev.filter(c => c._id !== id));
      if (r.data.suspended) showToast(`User auto-suspended after ${r.data.strikes} strikes.`);
      else if (r.data.strikes) showToast(`Strike issued. User now has ${r.data.strikes}/3 strikes.`);
    } finally { setActionId(null); }
  };

  const total = builds.length + comments.length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Content Moderation</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {total > 0 ? `${total} item${total !== 1 ? 's' : ''} pending review` : 'No reports — all clear'}
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-neutral-900 border border-neutral-700 text-neutral-200 text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl animate-pulse">
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2">
        {[
          { key: 'builds',   label: `Builds (${builds.length})` },
          { key: 'comments', label: `Comments (${comments.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${tab === t.key ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'text-neutral-400 border-neutral-800 hover:text-neutral-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500 animate-pulse">Loading reports…</div>
      ) : tab === 'builds' ? (
        builds.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <p className="text-green-400 font-bold">No reported builds</p>
          </div>
        ) : (
          <div className="space-y-3">
            {builds.map(b => (
              <div key={b._id} className="bg-neutral-900 border border-red-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800 relative shrink-0">
                      {b.hero?.images?.portrait && <img src={b.hero.images.portrait} alt={b.hero?.name} className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    <div>
                      <Link to={`/builds/${b._id}`} className="font-black text-neutral-100 hover:text-teal-300 transition-colors">{b.title}</Link>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-xs text-neutral-500">
                          {b.hero?.name} · by{' '}
                          {b.author?._id ? (
                            <Link to={`/users/${b.author._id}`} className="text-neutral-300 hover:text-teal-400 transition-colors" onClick={e => e.stopPropagation()}>
                              {b.author.name}
                            </Link>
                          ) : (
                            b.author?.name ?? 'Unknown'
                          )}
                          {' · '}{timeAgo(b.createdAt)}
                        </p>
                        {b.author && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${(b.author.strikes ?? 0) >= 3 ? 'bg-red-950/60 text-red-400 border-red-900/50' : (b.author.strikes ?? 0) >= 2 ? 'bg-amber-950/60 text-amber-400 border-amber-900/50' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
                            {b.author.strikes ?? 0}/3 strikes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${b.autoFlagged ? 'text-amber-400 bg-amber-950/40 border-amber-900/50' : 'text-red-400 bg-red-950/40 border-red-900/50'}`}>
                      {b.autoFlagged ? 'Auto-Flagged' : 'User Report'}
                    </span>
                  </div>
                </div>
                {b.reportReason && (
                  <p className="text-xs text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 leading-relaxed">
                    <span className="text-neutral-600 font-bold uppercase tracking-wider text-[9px]">Reason: </span>{b.reportReason}
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => dismissBuild(b._id)} disabled={actionId === b._id}
                    className="text-xs font-bold text-neutral-400 hover:text-teal-400 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                    Dismiss Report
                  </button>
                  <button onClick={() => deleteBuild(b._id)} disabled={actionId === b._id}
                    className="text-xs font-bold text-neutral-400 hover:text-red-400 bg-neutral-800 hover:bg-red-950/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                    Delete Build
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        comments.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <p className="text-green-400 font-bold">No reported comments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map(c => (
              <div key={c._id} className="bg-neutral-900 border border-red-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-neutral-200">
                        {c.author?._id ? (
                          <Link to={`/users/${c.author._id}`} className="text-neutral-200 hover:text-teal-400 transition-colors">
                            {c.author.name}
                          </Link>
                        ) : (
                          c.author?.name ?? 'Unknown'
                        )}
                        <span className="font-normal text-neutral-500"> on </span>
                        {c.build?.title
                          ? <Link to={`/builds/${c.build?._id}`} className="text-teal-400 hover:underline">{c.build.title}</Link>
                          : 'a build'}
                      </p>
                      {c.author && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${(c.author.strikes ?? 0) >= 3 ? 'bg-red-950/60 text-red-400 border-red-900/50' : (c.author.strikes ?? 0) >= 2 ? 'bg-amber-950/60 text-amber-400 border-amber-900/50' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
                          {c.author.strikes ?? 0}/3 strikes
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{timeAgo(c.createdAt)}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${c.autoFlagged ? 'text-amber-400 bg-amber-950/40 border-amber-900/50' : 'text-red-400 bg-red-950/40 border-red-900/50'}`}>
                    {c.autoFlagged ? 'Auto-Flagged' : 'User Report'}
                  </span>
                </div>
                {c.reportReason && (
                  <p className="text-xs text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 italic">
                    <span className="not-italic text-neutral-600 font-bold uppercase tracking-wider text-[9px]">Reason: </span>{c.reportReason}
                  </p>
                )}
                <p className="text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 leading-relaxed">
                  {c.body}
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => dismissComment(c._id)} disabled={actionId === c._id}
                    className="text-xs font-bold text-neutral-400 hover:text-teal-400 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                    Dismiss Report
                  </button>
                  <button onClick={() => deleteComment(c._id)} disabled={actionId === c._id}
                    className="text-xs font-bold text-neutral-400 hover:text-red-400 bg-neutral-800 hover:bg-red-950/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                    Delete Comment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
