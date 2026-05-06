import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import BuildCalculator from '../components/builds/BuildCalculator.jsx';

export default function CreateBuildPage() {
  const [heroes, setHeroes] = useState([]);
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    Promise.all([api.get('/heroes'), api.get('/items')])
      .then(([h, i]) => {
        setHeroes(h.data);
        setItems(i.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 px-8 pt-6 pb-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 border-b border-neutral-800 pb-4 flex items-baseline gap-3">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Build <span className="text-teal-400">Calculator</span>
          </h1>
          <p className="text-sm text-neutral-500">
            Pick items, build your loadout, publish your guide.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-20 text-neutral-500 animate-pulse">Loading game data…</div>
        ) : error || heroes.length === 0 || items.length === 0 ? (
          <div className="bg-red-950/20 text-red-500 border border-red-900 rounded-lg p-6 text-center">
            <p className="font-bold text-lg mb-2">API Connection Failed</p>
            <p>Could not fetch heroes or items. Make sure the backend server is running.</p>
          </div>
        ) : (
          <BuildCalculator heroes={heroes} items={items} />
        )}
      </div>
    </main>
  );
}
