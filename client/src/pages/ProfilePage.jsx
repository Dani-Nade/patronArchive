import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import BuildsList from '../components/builds/BuildsList.jsx';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, updateUser, logout } = useAuth();
  const [name, setName]   = useState('');
  const [bio, setBio]     = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setAvatar(user.avatar ?? '');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.put('/auth/me', { name, bio, avatar });
      updateUser(r.data.user);
      setSavedAt(Date.now());
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    await api.delete('/auth/me');
    logout();
    navigate('/');
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-10">

        <header className="flex items-center gap-5 border-b border-neutral-800 pb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 shrink-0 relative">
            {avatar
              ? <img src={avatar} alt={user.name} className="absolute inset-0 w-full h-full object-cover" />
              : <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-teal-400">{user.name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">My Profile</p>
            <h1 className="text-2xl font-black text-neutral-100">{user.name}</h1>
            <p className="text-sm text-neutral-500">{user.email} · {user.role}</p>
          </div>
        </header>

        <form onSubmit={save} className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Edit Profile</p>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Avatar URL</label>
            <input type="url" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://…"
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Bio</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} maxLength={200}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-500/40" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-neutral-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {savedAt && <span className="text-xs text-teal-400">Saved.</span>}
            <button type="button" onClick={remove}
              className="ml-auto text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
              Delete account
            </button>
          </div>
        </form>

        <section>
          <header className="flex items-end justify-between mb-4 border-b border-neutral-800 pb-3">
            <h2 className="text-xl font-bold">My Builds</h2>
            <Link to="/builds/create" className="text-sm font-bold text-teal-400 hover:text-teal-300">+ New build</Link>
          </header>
          <BuildsList author={user._id ?? user.id} />
        </section>
      </div>
    </main>
  );
}
