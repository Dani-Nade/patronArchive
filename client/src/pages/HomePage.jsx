import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import TornEdge from '../components/layout/TornEdge.jsx';

/* ── The vermillion ticker strip — a rotated marquee of the roster, like a
      pasted-on poster sticker. Two copies of the row make the loop seamless. ── */
function Ticker({ heroes }) {
  const names = heroes.length
    ? heroes.slice(0, 16).map(h => h.name)
    : ['Haze', 'Seven', 'Bebop', 'Abrams', 'Wraith', 'Ivy', 'Lash', 'Victor'];
  return (
    <div className="overflow-hidden py-4" aria-hidden="true">
      <div className="-mx-4 rotate-[-1.1deg] bg-ember-500 text-neutral-950 shadow-press-sm">
        <div className="flex w-max animate-marquee">
          {[0, 1].map(k => (
            <div key={k} className="flex items-center shrink-0">
              {names.map((n, i) => (
                <span key={i} className="flex items-center">
                  <span className="font-display text-lg uppercase whitespace-nowrap px-5 py-2">{n}</span>
                  <span className="text-neutral-950/40 text-sm">⊙</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Layered poster collage: one big framed portrait, two tilted behind,
      a vermillion sticker tag. The official page's fanned-cards move. ── */
function Collage({ heroes }) {
  if (heroes.length < 3) return null;
  const [a, b, c] = heroes;
  return (
    <div className="relative h-[430px] hidden lg:block" aria-hidden="true">
      <div className="halftone absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

      {/* back-left card */}
      <div className="absolute left-2 top-10 w-44 aspect-[3/4] rotate-[-9deg] rounded-lg overflow-hidden border-2 border-neutral-100/10 shadow-press bg-neutral-800">
        <img src={b.images?.portrait} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent" />
      </div>

      {/* back-right card */}
      <div className="absolute right-0 bottom-4 w-40 aspect-[3/4] rotate-[8deg] rounded-lg overflow-hidden border-2 border-neutral-100/10 shadow-press bg-neutral-800">
        <img src={c.images?.portrait} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent" />
      </div>

      {/* main card with marigold offset frame */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[2deg]">
        <div className="absolute inset-0 translate-x-3 translate-y-3 bg-amber-400 rounded-xl" />
        <div className="relative w-64 aspect-[3/4] rounded-xl overflow-hidden border-2 border-neutral-100/15 bg-neutral-800">
          <img src={a.images?.portrait} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-transparent" />
          <span className="absolute bottom-3 left-3 font-display text-neutral-100 text-lg drop-shadow">{a.name}</span>
        </div>
      </div>

      {/* sticker tag */}
      <span className="ribbon text-xs absolute -left-2 bottom-16 rotate-[-7deg]">{heroes.length} heroes strong</span>
    </div>
  );
}

function BuildCard({ build }) {
  const id = build._id ?? build.id;
  const net = (build.upvotes?.length ?? 0) - (build.downvotes?.length ?? 0);
  return (
    <Link to={`/builds/${id}`}
      className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-press rounded-xl p-4 transition-all group flex gap-4 items-start">
      <div className="w-12 h-16 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-800 relative -rotate-2 group-hover:rotate-0 transition-transform">
        {build.hero?.images?.portrait
          ? <img src={build.hero.images.portrait} alt={build.hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          : <span className="absolute inset-0 flex items-center justify-center text-amber-400 font-display text-lg">{build.hero?.name?.charAt(0)}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-0.5">{build.hero?.name}</p>
        <h3 className="font-bold text-neutral-100 group-hover:text-amber-300 transition-colors leading-snug line-clamp-2 text-sm">{build.title}</h3>
        <p className="text-[11px] text-neutral-500 mt-1">by {build.author?.name ?? 'Unknown'}</p>
      </div>
      <div className="shrink-0 flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2">
        <span className="text-amber-500 text-xs">▲</span>
        <span className="font-mono font-bold text-xs text-neutral-300">{net}</span>
      </div>
    </Link>
  );
}

function HeroCard({ hero }) {
  return (
    <Link to={`/builds?hero=${encodeURIComponent(hero.name)}`}
      className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-amber-500/50 hover:-translate-y-1 hover:shadow-press transition-all group cursor-pointer flex flex-col">
      <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
        {hero.images?.portrait
          ? <img src={hero.images.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="absolute inset-0 flex items-center justify-center text-neutral-600 font-medium group-hover:text-amber-400 transition-colors">{hero.name}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent opacity-70" />
      </div>
      <div className="p-2.5 text-center bg-neutral-900 relative z-10 border-t border-neutral-800">
        <h3 className="font-bold text-neutral-100 group-hover:text-amber-400 transition-colors truncate text-sm">{hero.name}</h3>
      </div>
    </Link>
  );
}

/* Oversized section header: eyebrow + huge slab, action on the baseline. */
function SectionHead({ eyebrow, title, accent, action }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-display text-4xl sm:text-5xl text-neutral-100 leading-none">
          {title} {accent && <span className="text-amber-400">{accent}</span>}
        </h2>
      </div>
      {action}
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans overflow-x-hidden">

      {/* ══ Hero — asymmetric poster ══ */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-14 sm:pt-20 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_25%_0%,rgba(247,172,46,0.10),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_90%_80%,rgba(45,212,191,0.05),transparent)]" />
        <div className="halftone absolute top-6 left-[55%] w-64 h-72 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden="true" />

        {/* ghost lettering bleeding off the right edge */}
        <span className="font-display text-[9rem] sm:text-[13rem] leading-none text-stroke-cream absolute -right-12 top-6 rotate-[-4deg] select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true">
          ARCHIVE
        </span>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_.95fr] gap-12 items-center">
          <div>
            <span className="ribbon text-sm mb-7">Community Build Hub</span>
            <h1 className="font-display text-6xl sm:text-7xl xl:text-8xl leading-[0.9] text-neutral-100 mb-7">
              The<br />
              Patron's<br />
              <span className="text-amber-400">Archive</span>
            </h1>
            <p className="text-lg text-neutral-400 max-w-md leading-relaxed mb-9">
              Hero builds, item math and lane arguments — written, rated and
              torn apart by the Deadlock community.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/builds/create" className="btn-primary px-8 py-3.5 text-sm tracking-wide">
                Create a Build
              </Link>
              <Link to="/builds" className="btn-secondary px-8 py-3.5 text-sm">
                Browse Builds
              </Link>
              <Link to="/forums"
                className="text-teal-400 hover:text-teal-300 font-bold text-sm transition-colors">
                Forums →
              </Link>
            </div>
          </div>

          <Collage heroes={heroes} />
        </div>
      </section>

      {/* ══ Roster ticker ══ */}
      <Ticker heroes={heroes} />

      {/* ══ Stats — giant slab numbers, no boxes ══ */}
      <TornEdge fill="#1d1a16" />
      <section className="px-4 sm:px-8 py-14 bg-neutral-900 relative overflow-hidden">
        <div className="halftone absolute inset-y-0 right-0 w-72 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-10">
          {[
            { value: stats.builds === '—' ? '—' : `${stats.builds}+`, label: 'Community Builds' },
            { value: stats.heroes === '—' ? '—' : stats.heroes, label: 'Playable Heroes' },
            { value: '173', label: 'Shop Items Tracked' },
            { value: '24/7', label: 'Always Open' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-x-16">
              {i > 0 && <div className="hidden md:block w-px h-16 bg-neutral-700/50" />}
              <div className="text-center">
                <div className="font-display text-6xl sm:text-7xl text-amber-400 leading-none">{s.value}</div>
                <div className="eyebrow mt-3">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <TornEdge fill="#1d1a16" flip />

      {/* ══ Trending builds ══ */}
      {trending.length > 0 && (
        <section className="px-4 sm:px-8 pt-20 pb-16 relative">
          <div className="max-w-5xl mx-auto">
            <SectionHead eyebrow="Top-rated by the community right now" title="Trending" accent="Builds"
              action={<Link to="/builds?sort=top" className="text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors shrink-0 pb-1">View all →</Link>} />
            <div className="grid sm:grid-cols-2 gap-4">
              {trending.map(b => <BuildCard key={b._id ?? b.id} build={b} />)}
            </div>
          </div>
        </section>
      )}

      {/* ══ The ritual — full-bleed marigold band, the Hidden King move ══ */}
      <TornEdge fill="#f7ac2e" />
      <section className="relative bg-amber-400 text-neutral-950 px-4 sm:px-8 py-16 overflow-hidden">
        <div className="halftone-ink absolute inset-y-0 left-0 w-80 opacity-70 [mask-image:linear-gradient(to_right,black,transparent)]" aria-hidden="true" />
        <span className="font-display text-[8rem] sm:text-[11rem] leading-none text-stroke-ink opacity-25 absolute -right-8 -bottom-10 rotate-[-3deg] select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true">
          RITUAL
        </span>

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-950/60 mb-2">Three steps from idea to published guide</p>
            <h2 className="font-display text-4xl sm:text-6xl leading-none">The ritual takes form…</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { num: '01', title: 'Pick Your Hero', desc: 'Browse the full roster and choose the Deadlock hero you want to build around.' },
              { num: '02', title: 'Build Your Items', desc: 'Plan the loadout in the calculator — every shop item, priced in souls, across all three slots.' },
              { num: '03', title: 'Publish & Share', desc: 'Write the early/mid/late guide, pin a YouTube VOD with timestamps, and put it to the vote.' },
            ].map((s, i) => (
              <div key={s.num} className={`${i === 1 ? 'sm:translate-y-4' : ''}`}>
                <span className="font-display text-7xl sm:text-8xl leading-none text-stroke-ink block">{s.num}</span>
                <h3 className="font-display text-xl mt-3 mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-950/75 max-w-[36ch]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <TornEdge fill="#f7ac2e" flip />

      {/* ══ Hero roster ══ */}
      <section className="px-4 sm:px-8 pt-20 pb-10 relative overflow-hidden">
        <span className="font-display text-[8rem] leading-none text-stroke-cream absolute -left-8 top-6 rotate-[3deg] select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true">
          ROSTER
        </span>
        <div className="relative max-w-7xl mx-auto">
          <SectionHead eyebrow="Click a hero to browse their builds" title="Hero" accent="Roster"
            action={
              <span className="text-sm font-medium text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 shrink-0 mb-1">
                {heroesLoading ? '…' : `${heroes.length} Available`}
              </span>
            } />
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
