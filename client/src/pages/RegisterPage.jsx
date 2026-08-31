import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { register, user, loading: authLoading } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate(redirect || '/', { replace: true });
  }, [user, authLoading, navigate, redirect]);

  if (authLoading) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate(redirect || '/builds');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl text-neutral-100">
            Join the <span className="text-amber-400">Archive</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Sign up to publish builds and join the community.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Display Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
            <p className="text-xs text-neutral-600 mt-1">At least 6 characters.</p>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-neutral-950 font-black py-3 rounded-xl transition-colors active:scale-[0.99]">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="text-teal-400 hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </main>
  );
}
