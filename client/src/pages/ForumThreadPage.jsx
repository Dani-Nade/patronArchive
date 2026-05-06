import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

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

function Avatar({ user, size = 9 }) {
  const cls = `w-${size} h-${size} rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden relative shrink-0`;
  return (
    <div className={cls}>
      {user?.avatar
        ? <img src={user.avatar} alt={user.name} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-teal-400">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
      }
    </div>
  );
}

function ReplyBox({ placeholder = 'Write a reply…', onSubmit, onCancel, autoFocus }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try { await onSubmit(body.trim()); setBody(''); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        rows={3}
        maxLength={2000}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600 leading-relaxed"
      />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving || !body.trim()}
          className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-black font-black text-xs px-4 py-2 rounded-lg transition-colors">
          {saving ? 'Posting…' : 'Post Reply'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ReplyItem({ reply, user, onDelete, onReply, depth = 0 }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const isOwn  = user && reply.author?._id === user._id;
  const isAdmin = user?.role === 'admin';

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-8 sm:ml-12' : ''}`}>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Avatar user={reply.author} size={8} />
        {depth === 0 && <div className="w-px flex-1 bg-neutral-800 mt-1" />}
      </div>

      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-sm font-bold text-neutral-200">{reply.author?.name ?? 'Unknown'}</span>
          <span className="text-[11px] text-neutral-600">{timeAgo(reply.createdAt)}</span>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{reply.body}</p>

        <div className="flex items-center gap-4 mt-3">
          {depth === 0 && user && (
            <button onClick={() => setShowReplyBox(v => !v)}
              className="text-xs text-neutral-500 hover:text-teal-400 transition-colors font-medium">
              ↩ Reply
            </button>
          )}
          {(isOwn || isAdmin) && (
            <button onClick={() => onDelete(reply._id)}
              className="text-xs text-neutral-600 hover:text-red-400 transition-colors">
              Delete
            </button>
          )}
        </div>

        {showReplyBox && (
          <div className="mt-3">
            <ReplyBox
              autoFocus
              placeholder={`Replying to ${reply.author?.name}…`}
              onSubmit={async (body) => { await onReply(body, reply._id); setShowReplyBox(false); }}
              onCancel={() => setShowReplyBox(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumThreadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [thread,  setThread]  = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tr, rr] = await Promise.all([
        api.get(`/forums/threads/${id}`),
        api.get(`/forums/threads/${id}/replies`),
      ]);
      setThread(tr.data.thread);
      setReplies(rr.data.replies ?? []);
      if (user) setUpvoted(tr.data.thread.upvotes?.includes(user._id));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const toggleUpvote = async () => {
    if (!user) { navigate(`/login?redirect=/forums/${id}`); return; }
    const r = await api.post(`/forums/threads/${id}/upvote`);
    setThread(t => ({ ...t, upvotes: Array(r.data.upvotes).fill(null) }));
    setUpvoted(r.data.upvoted);
  };

  const postReply = async (body, parentReply = null) => {
    if (!user) { navigate(`/login?redirect=/forums/${id}`); return; }
    const r = await api.post(`/forums/threads/${id}/replies`, { body, parentReply });
    setReplies(prev => [...prev, r.data.reply]);
    setThread(t => ({ ...t, replyCount: (t.replyCount ?? 0) + 1 }));
  };

  const deleteReply = async (replyId) => {
    if (!confirm('Delete this reply?')) return;
    await api.delete(`/forums/replies/${replyId}`);
    setReplies(prev => prev.filter(r => r._id !== replyId));
    setThread(t => ({ ...t, replyCount: Math.max(0, (t.replyCount ?? 1) - 1) }));
  };

  const deleteThread = async () => {
    if (!confirm('Delete this thread and all its replies?')) return;
    await api.delete(`/forums/threads/${id}`);
    navigate('/forums');
  };

  if (loading) return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Loading…</p>
    </main>
  );

  if (!thread) return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-neutral-500">Thread not found.</p>
    </main>
  );

  const isOwn   = user && thread.author?._id === user._id;
  const isAdmin = user?.role === 'admin';

  // Separate top-level replies and child replies
  const topLevel = replies.filter(r => !r.parentReply);
  const childMap  = {};
  replies.filter(r => r.parentReply).forEach(r => {
    const pid = r.parentReply?._id ?? r.parentReply;
    if (!childMap[pid]) childMap[pid] = [];
    childMap[pid].push(r);
  });

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <nav className="text-[11px] text-neutral-600 flex items-center gap-1.5">
          <Link to="/forums" className="hover:text-teal-400 transition-colors">Forums</Link>
          <span>/</span>
          <span className="text-neutral-400 truncate">{thread.title}</span>
        </nav>

        {/* Thread OP */}
        <article className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-4">
            <Avatar user={thread.author} size={10} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-neutral-200">{thread.author?.name ?? 'Unknown'}</span>
                {thread.category && (
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CAT_COLORS[thread.category] ?? CAT_COLORS.general}`}>
                    {thread.category}
                  </span>
                )}
                {thread.pinned && <span className="text-[9px] text-teal-400 font-bold">📌 Pinned</span>}
                {thread.locked && <span className="text-[9px] text-neutral-500 font-bold">🔒 Locked</span>}
                <span className="text-[11px] text-neutral-600 ml-auto">{timeAgo(thread.createdAt)}</span>
              </div>
              <h1 className="text-2xl font-black text-white leading-snug">{thread.title}</h1>
            </div>
          </div>

          <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap text-sm">{thread.body}</p>

          <div className="flex items-center gap-5 pt-4 border-t border-neutral-800">
            <button onClick={toggleUpvote}
              className={`flex items-center gap-2 text-sm font-bold transition-colors ${upvoted ? 'text-amber-400' : 'text-neutral-500 hover:text-amber-400'}`}>
              <span>▲</span>
              <span>{thread.upvotes?.length ?? 0}</span>
            </button>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span>💬</span>
              <span>{thread.replyCount ?? 0} replies</span>
            </div>
            {(isOwn || isAdmin) && (
              <button onClick={deleteThread}
                className="ml-auto text-xs text-neutral-600 hover:text-red-400 transition-colors">
                Delete thread
              </button>
            )}
          </div>
        </article>

        {/* Reply input (if not locked) */}
        {!thread.locked && user ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Leave a Reply</p>
            <ReplyBox onSubmit={(body) => postReply(body, null)} />
          </div>
        ) : !user ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
            <p className="text-sm text-neutral-400">
              <Link to={`/login?redirect=/forums/${id}`} className="text-teal-400 hover:underline font-bold">Log in</Link>
              {' or '}
              <Link to={`/register?redirect=/forums/${id}`} className="text-teal-400 hover:underline font-bold">sign up</Link>
              {' to reply.'}
            </p>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
            <p className="text-sm text-neutral-500">🔒 This thread is locked.</p>
          </div>
        )}

        {/* Replies */}
        {topLevel.length > 0 && (
          <section className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-4">
              {thread.replyCount ?? topLevel.length} Replies
            </p>
            {topLevel.map(reply => (
              <div key={reply._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 pt-5 pb-2">
                <ReplyItem
                  reply={reply}
                  user={user}
                  depth={0}
                  onDelete={deleteReply}
                  onReply={postReply}
                />
                {/* Child replies */}
                {(childMap[reply._id] ?? []).map(child => (
                  <ReplyItem
                    key={child._id}
                    reply={child}
                    user={user}
                    depth={1}
                    onDelete={deleteReply}
                    onReply={postReply}
                  />
                ))}
              </div>
            ))}
          </section>
        )}

        {replies.length === 0 && (
          <p className="text-center text-neutral-600 text-sm py-8">No replies yet. Be the first!</p>
        )}
      </div>
    </main>
  );
}
