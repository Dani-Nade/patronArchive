import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { DUMMY_MAP } from '../../lib/dummyBuilds.js';

const SLOT_BORDER = {
  weapon: 'border-amber-500/40', vitality: 'border-green-500/40', spirit: 'border-purple-500/40',
};
const SLOT_LABEL = {
  weapon: 'text-amber-400', vitality: 'text-green-400', spirit: 'text-purple-400',
};
const GUIDE_PHASES = [
  { key: 'early', label: 'Early Game', color: 'text-green-400',  dot: 'bg-green-500',  bar: 'bg-green-950/40 border-green-900/30' },
  { key: 'mid',   label: 'Mid Game',   color: 'text-amber-400',  dot: 'bg-amber-500',  bar: 'bg-amber-950/40 border-amber-900/30' },
  { key: 'late',  label: 'End Game',   color: 'text-red-400',    dot: 'bg-red-500',    bar: 'bg-red-950/40 border-red-900/30' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d} days ago`;
  if (d < 30)  return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function CommentSection({ buildId }) {
  const { user } = useAuth();
  const [comments, setComments]     = useState([]);
  const [body, setBody]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [posting, setPosting]       = useState(false);
  const [error, setError]           = useState('');
  const [flagWarning, setFlagWarning] = useState(null);
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (!buildId || buildId.length < 10) { setLoading(false); return; }
    api.get(`/comments?build=${buildId}`)
      .then(r => setComments(r.data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildId]);

  const postComment = async (bypass = false) => {
    if (!body.trim()) return;
    setPosting(true); setError(''); setFlagWarning(null);
    try {
      const r = await api.post('/comments', { build: buildId, body, ...(bypass && { bypass: true }) });
      setComments(prev => [r.data.comment, ...prev]);
      setBody('');
    } catch (err) {
      const data = err.response?.data;
      if (data?.flagged) setFlagWarning(data.words ?? []);
      else setError(data?.error ?? 'Failed to post comment');
    } finally { setPosting(false); }
  };

  const submit = (e) => { e.preventDefault(); postComment(false); };

  const deleteComment = async (id) => {
    if (!confirm('Delete this comment?')) return;
    await api.delete(`/comments/${id}`);
    setComments(prev => prev.filter(c => c._id !== id));
  };

  const submitCommentReport = async () => {
    if (!reportReason.trim()) return;
    await api.post(`/comments/${reportingId}/report`, { reason: reportReason });
    setReportingId(null); setReportReason('');
  };

  return (
    <div className="space-y-4">
      <span className="ribbon text-sm">
        Community Discussion ({comments.length})
      </span>

      {user && (
        <form onSubmit={submit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
          <textarea
            rows={3}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your thoughts on this build…"
            maxLength={1000}
            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {flagWarning && (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-400">⚠ Flagged words detected:</p>
              <div className="flex flex-wrap gap-1.5">
                {flagWarning.map((w, i) => <span key={i} className="bg-red-950/50 border border-red-800/50 text-red-400 font-mono text-xs px-2 py-0.5 rounded-full">{w}</span>)}
              </div>
              <p className="text-[10px] text-neutral-500">Posting anyway flags your comment for admin review.</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setFlagWarning(null)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs py-1.5 rounded-lg transition-colors">Edit</button>
                <button type="button" onClick={() => postComment(true)} disabled={posting}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs py-1.5 rounded-lg transition-colors">Post Anyway</button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-600">{body.length}/1000</span>
            <button type="submit" disabled={posting || !body.trim() || !!flagWarning}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-neutral-950 font-bold text-xs px-4 py-2 rounded-xl transition-colors">
              {posting ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}
      {!user && (
        <p className="text-sm text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <a href="/login" className="text-teal-400 hover:underline">Log in</a> to join the discussion.
        </p>
      )}

      {loading
        ? <p className="text-center py-6 text-neutral-500 animate-pulse text-sm">Loading comments…</p>
        : comments.length === 0
          ? <p className="text-center py-6 text-neutral-600 text-sm">No comments yet. Be the first!</p>
          : <div className="space-y-3">
              {comments.map(c => (
                <div key={c._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden relative shrink-0">
                        {c.author?.avatar
                          ? <img src={c.author.avatar} alt={c.author.name} className="absolute inset-0 w-full h-full object-cover" />
                          : <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-teal-400">{c.author?.name?.charAt(0)}</span>}
                      </div>
                      {c.author?._id ? (
                        <Link to={`/users/${c.author._id}`} className="text-sm font-bold text-neutral-200 hover:text-amber-400 transition-colors" onClick={e => e.stopPropagation()}>
                          {c.author.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-neutral-200">{c.author?.name ?? 'Unknown'}</span>
                      )}
                      <span className="text-[10px] text-neutral-600">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && c.author?._id !== user._id && (
                        <button onClick={() => { setReportingId(c._id); setReportReason(''); }}
                          className="text-[10px] text-neutral-600 hover:text-amber-400 transition-colors">
                          Report
                        </button>
                      )}
                      {user && (user._id === c.author?._id || user.role === 'admin') && (
                        <button onClick={() => deleteComment(c._id)}
                          className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  {reportingId === c._id && (
                    <div className="mt-3 space-y-2 bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
                      <textarea rows={2} value={reportReason} onChange={e => setReportReason(e.target.value)}
                        placeholder="Reason for report…" maxLength={500}
                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
                      <div className="flex gap-2">
                        <button onClick={() => setReportingId(null)}
                          className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs py-1.5 rounded-lg transition-colors">Cancel</button>
                        <button onClick={submitCommentReport} disabled={!reportReason.trim()}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs py-1.5 rounded-lg transition-colors">Submit</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
      }
    </div>
  );
}

export default function BuildView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [build, setBuild]     = useState(null);
  const [missing, setMissing] = useState(false);
  const [activeTs, setActiveTs] = useState(null);
  const [voting, setVoting]       = useState(false);
  const [voteState, setVoteState] = useState({ up: 0, down: 0 });
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const playerRef = useRef(null);

  const isLocalId = !id || id.length < 10;

  useEffect(() => {
    if (DUMMY_MAP[id]) { setBuild(DUMMY_MAP[id]); return; }
    const local = JSON.parse(localStorage.getItem('published_builds') || '{}');
    if (local[id]) { setBuild(local[id]); return; }
    api.get(`/builds/${id}`)
      .then(r => {
        setBuild(r.data.build);
        const b = r.data.build;
        setVoteState({ up: b.upvotes?.length ?? 0, down: b.downvotes?.length ?? 0 });
      })
      .catch(() => setMissing(true));
  }, [id]);

  const seekTo = (ts, idx) => {
    setActiveTs(idx);
    const win = playerRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo',    args: [ts.seconds, true] }), '*');
    win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
  };

  const vote = async (dir) => {
    if (!user || voting || isLocalId) return;
    setVoting(true);
    try {
      const r = await api.post(`/builds/${id}/vote`, { vote: dir });
      setVoteState({ up: r.data.upvotes, down: r.data.downvotes });
    } finally { setVoting(false); }
  };

  const reportBuild = async () => {
    if (!user || isLocalId || !reportReason.trim()) return;
    await api.post(`/builds/${id}/report`, { reason: reportReason });
    setReported(true); setShowReport(false); setReportReason('');
  };

  const deleteBuild = async () => {
    if (!confirm('Delete this build? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/builds/${id}`);
      navigate('/builds');
    } finally { setDeleting(false); }
  };

  const isOwner = user && build && (build.author?._id === user._id || build.author === user._id);
  const isAdmin = user?.role === 'admin';

  if (missing) return (
    <div className="text-center py-24 text-neutral-500">
      Build not found.{' '}
      <a href="/builds/create" className="text-teal-400 hover:underline">Create one?</a>
    </div>
  );
  if (!build) return <div className="text-center py-24 text-neutral-500 animate-pulse">Loading…</div>;

  const filledItems = build.items.filter(Boolean);
  const hasGuide = build.guide?.early || build.guide?.mid || build.guide?.late;
  const net = voteState.up - voteState.down;

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Header banner */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 min-h-[140px]">
        <div className="absolute inset-0 bg-neutral-900" />
        {build.hero?.images?.portrait && (
          <div className="absolute right-0 top-0 w-72 h-full opacity-20 pointer-events-none">
            <img src={build.hero.images.portrait} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/95 via-neutral-900/70 to-transparent" />
        <div className="halftone absolute inset-y-0 right-0 w-56 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between gap-6 p-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-20 relative rounded-xl overflow-hidden border border-neutral-700 shrink-0">
              {build.hero?.images?.portrait && <img src={build.hero.images.portrait} alt={build.hero.name} className="absolute inset-0 w-full h-full object-cover" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">{build.hero?.name}</p>
              <h1 className="font-display text-2xl sm:text-3xl text-neutral-100 leading-tight">{build.title}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <p className="text-amber-400 font-mono font-bold">{build.totalCost?.toLocaleString()} Souls</p>
                {build.role && <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{build.role}</span>}
                {build.patch && <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">Patch {build.patch}</span>}
                {build.updatedAt && build.updatedAt !== build.createdAt && (
                  <span className="text-[10px] text-neutral-600">edited {timeAgo(build.updatedAt)}</span>
                )}
              </div>
              {build.author && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-700">
                  <span className="text-xs text-neutral-500">By</span>
                  {build.author._id ? (
                    <Link to={`/users/${build.author._id}`} className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors">
                      {build.author.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-neutral-300">{build.author.name}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!isLocalId && (
              <div className="flex items-center gap-1">
                <button onClick={() => vote('up')} disabled={voting || !user}
                  className="flex flex-col items-center bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-xl px-3 py-2 transition-all disabled:opacity-50">
                  <span className="text-amber-500 text-sm leading-none">▲</span>
                  <span className="font-mono font-bold text-sm text-neutral-200 mt-0.5">{net}</span>
                </button>
                <button onClick={() => vote('down')} disabled={voting || !user}
                  className="flex flex-col items-center bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-red-500/30 rounded-xl px-3 py-2 transition-all disabled:opacity-50">
                  <span className="text-neutral-500 text-sm leading-none">▼</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {(isOwner || isAdmin) && !isLocalId && (
                <>
                  <button onClick={() => navigate(`/builds/${id}/edit`)}
                    className="text-xs font-bold text-neutral-400 hover:text-amber-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button onClick={deleteBuild} disabled={deleting}
                    className="text-xs font-bold text-neutral-400 hover:text-red-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors">
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </>
              )}
              {user && !isOwner && !reported && !isLocalId && !showReport && (
                <button onClick={() => setShowReport(true)}
                  className="text-[10px] font-medium text-neutral-600 hover:text-amber-400 transition-colors">
                  ⚑ Report
                </button>
              )}
              {reported && <span className="text-[10px] text-amber-400">Reported</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Report form */}
      {showReport && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 space-y-3">
          <p className="font-bold text-amber-400 text-sm">⚑ Report this build</p>
          <textarea rows={3} value={reportReason} onChange={e => setReportReason(e.target.value)}
            placeholder="Describe the issue (required)…" maxLength={500}
            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          <div className="flex gap-3">
            <button onClick={() => { setShowReport(false); setReportReason(''); }}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm py-2 rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={reportBuild} disabled={!reportReason.trim()}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-sm py-2 rounded-xl transition-colors">
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <span className="ribbon text-sm mb-5">Item Build</span>
        <div className="flex flex-wrap gap-4">
          {filledItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-14 h-14 relative rounded-xl bg-neutral-800 border overflow-hidden ${SLOT_BORDER[item.slot] ?? 'border-neutral-700'}`}>
                {item.images?.icon && <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />}
              </div>
              <span className="text-[9px] text-neutral-400 text-center w-14 truncate">{item.name}</span>
              <span className={`text-[9px] font-mono font-bold ${SLOT_LABEL[item.slot] ?? 'text-neutral-500'}`}>{item.cost?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guide */}
      {hasGuide && (
        <div className="space-y-4">
          <span className="ribbon text-sm">Build Guide</span>
          {GUIDE_PHASES.filter(({ key }) => build.guide[key]).map(({ key, label, color, dot, bar }) => (
            <div key={key} className={`rounded-2xl border overflow-hidden ${bar}`}>
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                <span className={`font-bold text-xs uppercase tracking-widest ${color}`}>{label}</span>
              </div>
              <p className="px-5 py-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{build.guide[key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {build.video && (
        <div className="space-y-4">
          <span className="ribbon text-sm">Video Guide</span>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="aspect-video">
              <iframe
                ref={playerRef}
                src={`https://www.youtube.com/embed/${build.video.id}?enablejsapi=1&rel=0&modestbranding=1`}
                title={build.video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            {build.video.timestamps?.length > 0 && (
              <div className="p-5 border-t border-neutral-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-3">Jump to</p>
                <div className="flex flex-wrap gap-2">
                  {build.video.timestamps.map((ts, i) => (
                    <button key={i} onClick={() => seekTo(ts, i)}
                      className={`flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95 ${ts.color} ${activeTs === i ? 'ring-2 ring-white/20 scale-105' : ''}`}>
                      <span className="text-[10px]">▶</span>
                      <span className="font-mono font-bold">{ts.time}</span>
                      <span>{ts.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      <CommentSection buildId={id} />

    </div>
  );
}
