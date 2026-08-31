import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

/* Jagged section divider — the torn-paper edge from the official site.
   Deterministic points so it never shifts between renders. */
function TornEdge({ fill = '#1d1a16', flip = false }) {
  const d = 'M0,12 L0,7 L40,10 L85,4 L130,9 L175,3 L225,8 L280,2 L330,7 L385,4 L440,9 L495,3 L540,8 L600,2 L655,7 L710,3 L760,9 L820,4 L875,8 L930,2 L985,7 L1040,4 L1095,9 L1150,3 L1200,7 L1200,12 Z';
  return (
    <svg viewBox="0 0 1200 12" preserveAspectRatio="none" aria-hidden="true"
      className={`block w-full h-3 ${flip ? 'rotate-180' : ''}`}>
      <path d={d} fill={fill} />
    </svg>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="flex flex-col items-center px-8 py-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl">
      <span className="font-display text-3xl text-amber-400">{value}</span>
      <span className="eyebrow mt-1.5">{label}</span>
    </div>
  );
}

function BuildCard({ build }) {
  const id = build._id ?? build.id;
  const net = (build.upvotes?.length ?? 0) - (build.downvotes?.length ?? 0);
  return (
    <Link to={`/builds/${id}`}
      className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:shadow-glow-amber rounded-2xl p-4 transition-all group flex gap-4 items-start">
      <div className="w-12 h-16 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-800 relative -rotate-1 group-hover:rotate-0 transition-transform">
        {build.hero?.images?.portrait
          ? <img src={build.hero.images.portrait} alt={build.hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          : <span className="absolute inset-0 flex items-center justify-center text-amber-400 font-display text-lg">{build.hero?.name?.charAt(0)}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-0.5">{build.hero?.name}</p>
        <h3 className="font-bold text-neutral-100 group-hover:text-amber-300 transition-colors leading-snug line-clamp-2 text-sm">{build.title}</h3>
        <p className="text-[11px] text-neutral-500 mt-1">by {build.author?.name ?? 'Unknown'}</p>
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
      className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-amber-500/50 hover:shadow-glow-amber transition-all group cursor-pointer flex flex-col">
      <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
        {hero.images?.portrait
          ? <img src={hero.images.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="absolute inset-0 flex items-center justify-center text-neutral-600 font-medium group-hover:text-amber-400 transition-colors">{hero.name}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent opacity-70" />
      </div>
      <div className="p-3 text-center bg-neutral-900 relative z-10 border-t border-neutral-800">
        <h3 className="font-bold text-neutral-100 group-hover:text-amber-400 transition-colors truncate text-sm">{hero.name}</h3>
      </div>
    </Link>
  );
}

/* The official page fans the new heroes out as tilted poster cards.
   Same trick, with live portraits from the roster. */
function PortraitFan({ heroes }) {
  const tilts = ['-rotate-3 translate-y-2', 'rotate-2', '-rotate-1 translate-y-3', 'rotate-3 translate-y-1', '-rotate-2 translate-y-2', 'rotate-1'];
  return (
    <div className="flex justify-center items-end -space-x-3 sm:-space-x-4 mt-14" aria-hidden="true">
      {heroes.slice(0, 6).map((h, i) => (
        <div key={h.id}
          className={`w-20 sm:w-28 aspect-[3/5] rounded-lg overflow-hidden border-2 border-neutral-100/10 shadow-card bg-neutral-800 relative ${tilts[i]} ${i % 2 ? 'z-0' : 'z-10'}`}>
          <img src={h.images?.portrait} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 to-transparent" />
        </div>
      ))}
    </div>
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-16 sm:pt-20 pb-0">
        {/* warm glow + halftone corners, in place of the official collage */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(247,172,46,0.10),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_70%,rgba(45,212,191,0.05),transparent)]" />
        <div className="halftone absolute top-8 right-[4%] w-48 h-64 opacity-70 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]" aria-hidden="true" />
        <div className="halftone absolute bottom-10 left-[2%] w-56 h-48 opacity-50 [mask-image:radial-gradient(ellipse_at_bottom_left,black,transparent_75%)]" aria-hidden="true" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="ribbon text-sm mb-8">Community Build Hub</span>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mb-6 leading-[0.95] text-neutral-100">
            The Patron's<br />
            <span className="text-amber-400">Archive</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Discover optimal hero builds, study item strategies, and dominate your
            lanes with community-curated guides for Deadlock.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/builds/create" className="btn-primary px-8 py-3.5 text-sm tracking-wide">
              Create a Build
            </Link>
            <Link to="/builds" className="btn-secondary px-8 py-3.5 text-sm">
              Browse Builds
            </Link>
            <Link to="/forums"
              className="text-teal-400 hover:text-teal-300 font-bold text-sm flex items-center gap-1.5 transition-colors">
              Community Forums →
            </Link>
          </div>

          {!heroesLoading && heroes.length >= 6 && <PortraitFan heroes={heroes} />}
        </div>
      </section>

      {/* torn edge into the stats band */}
      <TornEdge fill="#1d1a16" />

      {/* ── Stats band ── */}
      <section className="px-4 sm:px-8 py-12 bg-neutral-900">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <StatCard value={stats.builds === '—' ? '—' : `${stats.builds}+`} label="Community Builds" />
          <StatCard value={stats.heroes === '—' ? '—' : `${stats.heroes}`} label="Playable Heroes" />
          <StatCard value="3" label="Guide Phases" />
          <StatCard value="24/7" label="Always Available" />
        </div>
      </section>
      <TornEdge fill="#1d1a16" flip />

      {/* ── Trending builds ── */}
      {trending.length > 0 && (
        <section className="px-4 sm:px-8 pt-16 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="ribbon-amber text-sm mb-3">Trending Builds</span>
                <p className="eyebrow mt-2">Top-rated by the community right now</p>
              </div>
              <Link to="/builds?sort=top" className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors shrink-0">View all →</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {trending.map(b => <BuildCard key={b._id ?? b.id} build={b} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="px-4 sm:px-8 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="ribbon text-sm">The Ritual Takes Form</span>
            <p className="eyebrow mt-3">Three steps from idea to published guide</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Pick Your Hero', desc: 'Browse the full roster and choose your Deadlock hero to start crafting a strategy.' },
              { num: '02', title: 'Build Your Items', desc: 'Use the item calculator to plan Early, Mid, and Late-game item selections across all three slots.' },
              { num: '03', title: 'Publish & Share', desc: 'Add a written guide, attach a YouTube VOD with timestamps, and share with the community.' },
            ].map((s, i) => (
              <div key={s.num} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${i === 1 ? 'sm:-rotate-1' : i === 2 ? 'sm:rotate-1' : 'sm:rotate-0'}`}>
                <span className="font-display text-4xl text-amber-500/25 leading-none">{s.num}</span>
                <h3 className="font-display text-lg text-neutral-100 mt-3 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero roster ── */}
      <section className="px-4 sm:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-neutral-800">
            <div>
              <span className="ribbon-amber text-sm mb-2">Hero Roster</span>
              <p className="eyebrow mt-2">Click a hero to browse builds</p>
            </div>
            <span className="text-sm font-medium text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 shrink-0">
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
