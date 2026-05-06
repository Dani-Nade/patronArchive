import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

function StatCard({ value, label }) {
  return (
    <div className="flex flex-col items-center px-8 py-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl">
      <span className="text-3xl font-black text-teal-400">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mt-1">{label}</span>
    </div>
  );
}

function BuildCard({ build }) {
  const id = build._id ?? build.id;
  const net = (build.upvotes?.length ?? 0) - (build.downvotes?.length ?? 0);
  return (
    <Link to={`/builds/${id}`}
      className="bg-neutral-900 border border-neutral-800 hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.08)] rounded-2xl p-4 transition-all group flex gap-4 items-start">
      <div className="w-12 h-16 rounded-xl overflow-hidden border border-neutral-700 shrink-0 bg-neutral-800 relative">
        {build.hero?.images?.portrait
          ? <img src={build.hero.images.portrait} alt={build.hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          : <span className="absolute inset-0 flex items-center justify-center text-teal-400 font-black text-lg">{build.hero?.name?.charAt(0)}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-500 mb-0.5">{build.hero?.name}</p>
        <h3 className="font-black text-neutral-100 group-hover:text-teal-300 transition-colors leading-snug line-clamp-2 text-sm">{build.title}</h3>
        <p className="text-[11px] text-neutral-600 mt-1">by {build.author?.name ?? 'Unknown'}</p>
      </div>
      <div className="shrink-0 flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2">
        <span className="text-amber-500 text-xs">▲</span>
        <span className="font-mono font-bold text-xs text-neutral-300">{net}</span>
      </div>
    </Link>
  );
}

function HeroCard({ hero }) {
  return (
    <Link to={`/builds?hero=${encodeURIComponent(hero.name)}`}
      className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-teal-500/50 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] transition-all group cursor-pointer flex flex-col">
      <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
        {hero.images?.portrait
          ? <img src={hero.images.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-medium group-hover:text-teal-400 transition-colors">{hero.name}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-60" />
      </div>
      <div className="p-3 text-center bg-neutral-900 relative z-10">
        <h3 className="font-bold text-neutral-100 group-hover:text-teal-400 transition-colors truncate text-sm">{hero.name}</h3>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [heroes, setHeroes]       = useState([]);
  const [trending, setTrending]   = useState([]);
  const [stats, setStats]         = useState({ builds: '—', heroes: '—' });
  const [heroesLoading, setHeroesLoading] = useState(true);

  useEffect(() => {
    api.get('/heroes')
      .then(r => { setHeroes(r.data); setStats(s => ({ ...s, heroes: r.data.length })); })
      .catch(() => {})
      .finally(() => setHeroesLoading(false));

    api.get('/builds?sort=top&limit=4')
      .then(r => setTrending((r.data.builds ?? []).slice(0, 4)))
      .catch(() => {});

    api.get('/builds')
      .then(r => setStats(s => ({ ...s, builds: r.data.builds?.length ?? '—' })))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-50 font-sans">

      {/* Hero section */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-16 sm:pt-24 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(20,184,166,0.05),transparent)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Community Build Hub
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-none">
            <span className="text-white">The </span>
            <span className="text-teal-400">Patron's</span>
            <br />
            <span className="text-white">Archive</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Discover optimal hero builds, study item strategies, and dominate your lanes with community-curated guides for Deadlock.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/builds/create"
              className="bg-teal-500 hover:bg-teal-400 text-black font-black px-8 py-3.5 rounded-xl transition-all active:scale-95 text-sm tracking-wide">
              Create a Build
            </Link>
            <Link to="/builds"
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold px-8 py-3.5 rounded-xl transition-all text-sm border border-neutral-700">
              Browse Builds
            </Link>
            <Link to="/forums"
              className="text-teal-400 hover:text-teal-300 font-bold text-sm flex items-center gap-1.5 transition-colors">
              Community Forums →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-4 sm:px-8 pb-16">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <StatCard value={stats.builds === '—' ? '—' : `${stats.builds}+`} label="Community Builds" />
          <StatCard value={stats.heroes === '—' ? '—' : `${stats.heroes}`} label="Playable Heroes" />
          <StatCard value="3" label="Guide Phases" />
          <StatCard value="24/7" label="Always Available" />
        </div>
      </section>

      {/* Trending builds */}
      {trending.length > 0 && (
        <section className="px-4 sm:px-8 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Trending Builds</h2>
                <p className="text-sm text-neutral-500 mt-0.5">Top-rated by the community right now</p>
              </div>
              <Link to="/builds?sort=top" className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {trending.map(b => <BuildCard key={b._id ?? b.id} build={b} />)}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-4 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-white tracking-tight text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Pick Your Hero', desc: 'Browse the full roster and choose your Deadlock hero to start crafting a strategy.' },
              { num: '02', title: 'Build Your Items', desc: 'Use the item calculator to plan Early, Mid, and Late-game item selections across all three slots.' },
              { num: '03', title: 'Publish & Share', desc: 'Add a written guide, attach a YouTube VOD with timestamps, and share with the community.' },
            ].map(s => (
              <div key={s.num} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <span className="text-4xl font-black text-teal-500/30 leading-none">{s.num}</span>
                <h3 className="text-lg font-black text-white mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero roster */}
      <section className="px-4 sm:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Hero Roster</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Click a hero to browse builds</p>
            </div>
            <span className="text-sm font-medium text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
              {heroesLoading ? '…' : `${heroes.length} Available`}
            </span>
          </div>
          {heroesLoading
            ? <div className="text-center py-20 text-neutral-500 animate-pulse">Loading heroes…</div>
            : heroes.length === 0
              ? <div className="text-center py-20 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <p className="text-neutral-400">Failed to load heroes. Check the backend connection.</p>
                </div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {heroes.map(hero => <HeroCard key={hero.id} hero={hero} />)}
                </div>
          }
        </div>
      </section>

    </main>
  );
}
