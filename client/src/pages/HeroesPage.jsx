import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

function HeroCard({ hero, buildCount }) {
  return (
    <Link to={`/heroes/${encodeURIComponent(hero.name)}`}
      className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 hover:-translate-y-1 hover:shadow-press rounded-xl overflow-hidden transition-all duration-300 group flex flex-col">

      <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
        {hero.images?.portrait ? (
          <img src={hero.images.portrait} alt={hero.name}
            className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-black text-4xl">
            {hero.name?.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        {buildCount > 0 && (
          <div className="absolute bottom-2 right-2 bg-neutral-950/80 border border-amber-500/30 backdrop-blur-sm rounded-lg px-2 py-0.5">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
              {buildCount} build{buildCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {buildCount === 0 && (
          <div className="absolute bottom-2 right-2 bg-black/50 border border-neutral-700 backdrop-blur-sm rounded-lg px-2 py-0.5">
            <span className="text-[9px] text-neutral-600 uppercase tracking-widest">No builds yet</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-black text-neutral-100 group-hover:text-amber-400 transition-colors truncate text-sm">
          {hero.name}
        </h3>
        {hero.role && (
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5 truncate">{hero.role}</p>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-neutral-800" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-neutral-800 rounded-full w-3/4" />
        <div className="h-2 bg-neutral-800 rounded-full w-1/2" />
      </div>
    </div>
  );
}

export default function HeroesPage() {
  const [heroes,      setHeroes]      = useState([]);
  const [buildCounts, setBuildCounts] = useState({});
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/heroes'),
      api.get('/builds'),
    ]).then(([heroRes, buildRes]) => {
      if (heroRes.status === 'fulfilled') setHeroes(heroRes.value.data ?? []);
      if (buildRes.status === 'fulfilled') {
        const counts = {};
        (buildRes.value.data.builds ?? []).forEach(b => {
          const n = b.hero?.name;
          if (n) counts[n] = (counts[n] ?? 0) + 1;
        });
        setBuildCounts(counts);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = heroes.filter(h =>
    !search || h.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBuilds    = Object.values(buildCounts).reduce((s, c) => s + c, 0);
  const coveredHeroes  = Object.keys(buildCounts).length;
  const topHeroName    = Object.entries(buildCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 font-sans">

      {/* ── Header ── */}
      <div className="relative overflow-hidden px-4 sm:px-8 pt-12 pb-10 border-b border-neutral-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(247,172,46,0.08),transparent)]" />
        <div className="relative max-w-7xl mx-auto">

          <span className="font-display text-[7rem] leading-none text-stroke-cream absolute -right-2 -top-6 rotate-[-3deg] select-none pointer-events-none whitespace-nowrap hidden md:block" aria-hidden="true">
            HEROES
          </span>
          <span className="ribbon text-sm mb-4">Hero Roster</span>

          <h1 className="font-display text-5xl sm:text-6xl text-neutral-100 leading-none">
            Hero <span className="text-amber-400">Directory</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5 max-w-xl">
            Browse the full Deadlock roster. Click any hero to see community builds, item breakdowns, and video guides.
          </p>

          {!loading && (
            <div className="flex flex-wrap gap-8 mt-7">
              {[
                { val: heroes.length,  label: 'Total Heroes'       },
                { val: totalBuilds,    label: 'Community Builds'   },
                { val: coveredHeroes,  label: 'Heroes Covered'     },
                { val: topHeroName,    label: 'Most Played',       color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <span className={`font-display text-xl ${s.color ?? 'text-amber-400'}`}>{s.val}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto">

        {/* ── Search ── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search heroes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
            />
          </div>
          {!loading && (
            <span className="text-xs text-neutral-600 font-medium bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
              {filtered.length} hero{filtered.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <p className="text-neutral-400 font-bold">No heroes match "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-3 text-teal-400 text-sm hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filtered.map(hero => (
              <HeroCard key={hero.id ?? hero.name} hero={hero} buildCount={buildCounts[hero.name] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
