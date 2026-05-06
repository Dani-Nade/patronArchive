import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';

const CATEGORIES = [
  { id: 'general',  label: 'General'   },
  { id: 'strategy', label: 'Strategy'  },
  { id: 'meta',     label: 'Meta'      },
  { id: 'help',     label: 'Help'      },
  { id: 'offtopic', label: 'Off-Topic' },
];

export default function CreateThreadPage() {
  const navigate = useNavigate();
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [category, setCategory] = useState('general');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
    setSaving(true);
    try {
      const r = await api.post('/forums/threads', { title, body, category });
      navigate(`/forums/${r.data.thread._id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to post thread.');
    } finally { setSaving(false); }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <nav className="text-[11px] text-neutral-600 mb-4 flex items-center gap-1.5">
            <Link to="/forums" className="hover:text-teal-400 transition-colors">Forums</Link>
            <span>/</span>
            <span className="text-neutral-400">New Thread</span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight">
            Start a <span className="text-teal-400">Discussion</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Post a question, share an opinion, or spark a debate.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button type="button" key={c.id} onClick={() => setCategory(c.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    category === c.id
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                      : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-neutral-300'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Title</label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600"
            />
            <p className="text-[10px] text-neutral-600 mt-1 text-right">{title.length}/200</p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Body</label>
            <textarea
              required
              rows={8}
              maxLength={5000}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your post here…"
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600 leading-relaxed"
            />
            <p className="text-[10px] text-neutral-600 mt-1 text-right">{body.length}/5000</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-black font-black text-sm px-6 py-2.5 rounded-xl transition-colors active:scale-[0.98]">
              {saving ? 'Posting…' : 'Post Thread'}
            </button>
            <Link to="/forums" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
