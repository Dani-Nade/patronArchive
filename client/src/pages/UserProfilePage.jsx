import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import BuildsList from '../components/builds/BuildsList.jsx';

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [buildCount, setBuildCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/auth/users/${id}`)
      .then(r => {
        setUser(r.data.user);
        setBuildCount(r.data.buildCount ?? 0);
      })
      .catch(e => {
        setError(e.response?.data?.error ?? 'User not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-8 pt-8 pb-16 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-20 text-neutral-500 animate-pulse">Loading profile…</div>
      </div>
    </main>
  );

  if (error || !user) return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-8 pt-8 pb-16 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-20">
          <p className="text-red-400 font-bold text-sm">{error || 'User not found'}</p>
          <button onClick={() => navigate('/builds')} className="text-teal-400 hover:underline text-sm mt-3">
            ← Back to builds
          </button>
        </div>
      </div>
    </main>
  );

  const isOwnProfile = currentUser?._id === user.id;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Profile Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 shrink-0 relative">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="absolute inset-0 w-full h-full object-cover" />
                : <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-teal-400">{user.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">User Profile</p>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-100">{user.name}</h1>
              <p className="text-sm text-neutral-500 mt-0.5 break-all">{user.email}</p>
              {user.bio && <p className="text-sm text-neutral-400 mt-1">{user.bio}</p>}
            </div>
          </div>
          {isOwnProfile && (
            <a href="/profile" className="self-start sm:self-auto bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0">
              Edit Profile
            </a>
          )}
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-teal-400">{buildCount}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-2">Builds</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-neutral-300">{user.role === 'admin' ? '⭐' : '—'}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-2">{user.role}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-neutral-300">{new Date(user.createdAt).getFullYear()}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mt-2">Joined</p>
          </div>
        </div>

        {/* Builds Section */}
        <section>
          <header className="flex items-end justify-between mb-4 border-b border-neutral-800 pb-3">
            <h2 className="text-xl font-bold">{isOwnProfile ? 'My Builds' : `${user.name}'s Builds`}</h2>
            {isOwnProfile && (
              <a href="/builds/create" className="text-sm font-bold text-teal-400 hover:text-teal-300">+ New build</a>
            )}
          </header>
          <BuildsList author={user.id} />
        </section>
      </div>
    </main>
  );
}
