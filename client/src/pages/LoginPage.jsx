import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { login, user, loading } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirect || (user.role === 'admin' ? '/admin' : '/'), { replace: true });
  }, [user, loading, navigate, redirect]);

  if (loading) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(email, password);
      navigate(redirect || (u.role === 'admin' ? '/admin' : '/builds'));
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl text-neutral-100">
            <span className="text-amber-400">Welcome</span> back
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Log in to publish and manage your builds.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600" />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-neutral-950 font-black py-3 rounded-xl transition-colors active:scale-[0.99]">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          New here?{' '}
          <Link to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'} className="text-teal-400 hover:underline font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
