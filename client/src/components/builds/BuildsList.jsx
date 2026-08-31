import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { DUMMY_BUILDS } from '../../lib/dummyBuilds.js';

const SLOT_COLOR = { weapon: '#f59e0b', vitality: '#22c55e', spirit: '#a855f7' };

function HeroAvatar({ build }) {
  const letter = build.hero?.name?.charAt(0).toUpperCase() ?? '?';
  const counts = { weapon: 0, vitality: 0, spirit: 0 };
  build.items?.forEach(i => i && counts[i.slot] !== undefined && counts[i.slot]++);
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const color = SLOT_COLOR[dominant] ?? '#6b7280';

  if (build.hero?.images?.portrait) {
    return (
      <div className="w-14 relative rounded-xl overflow-hidden border border-neutral-700 shrink-0" style={{ height: '4.5rem' }}>
        <img src={build.hero.images.portrait} alt={build.hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      </div>
    );
  }
  return (
    <div className="w-14 shrink-0 flex items-center justify-center rounded-xl font-black text-2xl border"
      style={{ height: '4.5rem', background: `${color}18`, borderColor: `${color}40`, color }}>
      {letter}
    </div>
  );
}

function SlotBar({ items }) {
  const filled = (items ?? []).filter(Boolean);
  if (!filled.length) return null;
  return (
    <div className="flex gap-0.5 h-1 w-24 rounded-full overflow-hidden">
      {filled.map((item, i) => (
        <div key={i} className="flex-1 rounded-full" style={{ backgroundColor: SLOT_COLOR[item.slot] ?? '#6b7280' }} />
      ))}
    </div>
  );
}

function PhaseChips({ guide }) {
  const phases = [
    { key: 'early', label: 'Early', cls: 'bg-green-950/60 text-green-400 border-green-900/50' },
    { key: 'mid',   label: 'Mid',   cls: 'bg-amber-950/60 text-amber-400 border-amber-900/50' },
    { key: 'late',  label: 'Late',  cls: 'bg-red-950/60 text-red-400 border-red-900/50' },
  ];
  return (
    <div className="flex gap-1.5">
      {phases.filter(p => guide?.[p.key]).map(p => (
        <span key={p.key} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.cls}`}>
          {p.label}
        </span>
      ))}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d} days ago`;
  if (d < 30)  return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function BuildsList({ search = '', role = '', sort = '', patch = '', author = '' }) {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role)   params.set('role', role);
    if (sort)   params.set('sort', sort);
    if (patch)  params.set('patch', patch);
    if (author) params.set('author', author);

    api.get(`/builds?${params}`)
      .then(r => {
        const dbBuilds = r.data.builds ?? [];
        const local = Object.values(JSON.parse(localStorage.getItem('published_builds') || '{}'));
        // Only merge localStorage builds with DB builds — no dummy data in live results
        let merged = [...dbBuilds, ...local];
        // Deduplicate by _id / id
        const seen = new Set();
        merged = merged.filter(b => {
          const id = b._id ?? b.id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        // Client-side re-filter for local builds (server already filtered DB builds)
        if (author) merged = merged.filter(b => (b.author?._id ?? b.author?.id) === author);
        setBuilds(merged);
      })
      .catch(() => {
        // On complete failure fall back to dummy data so the page isn't empty
        const local = Object.values(JSON.parse(localStorage.getItem('published_builds') || '{}'));
        setBuilds([...local, ...DUMMY_BUILDS]);
      })
      .finally(() => setLoading(false));
  }, [search, role, sort, patch, author]);

  if (loading && builds.length === 0) return (
    <p className="text-center py-12 text-neutral-500 animate-pulse">Loading builds…</p>
  );

  if (builds.length === 0) return (
    <p className="text-center py-12 text-neutral-500">No builds found.</p>
  );

  return (
    <div className="space-y-4">
      {builds.map(build => {
        const id = build._id ?? build.id;
        const filledItems = (build.items ?? []).filter(Boolean);
        const teaser = build.guide?.early || build.guide?.mid || build.guide?.late;
        return (
          <Link key={id} to={`/builds/${id}`}
            className="flex items-start gap-5 bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-press rounded-2xl p-5 transition-all group">

            <HeroAvatar build={build} />

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-lg text-neutral-100 group-hover:text-amber-300 transition-colors leading-tight">
                    {build.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    <span className="text-neutral-400">{build.hero?.name}</span>
                    {build.author?.name && (
                      <>
                        {' · by '}
                        {build.author._id ? (
                          <Link to={`/users/${build.author._id}`} className="text-neutral-300 hover:text-amber-400 transition-colors" onClick={e => e.stopPropagation()}>
                            {build.author.name}
                          </Link>
                        ) : (
                          <span className="text-neutral-300">{build.author.name}</span>
                        )}
                      </>
                    )}
                    {build.createdAt && <> · {timeAgo(build.createdAt)}</>}
                    {build.updatedAt && build.updatedAt !== build.createdAt && (
                      <span className="text-neutral-600"> · edited {timeAgo(build.updatedAt)}</span>
                    )}
                  </p>
                </div>
                {build.votes != null && (
                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 shrink-0">
                    <span className="text-amber-500 text-sm leading-none">▲</span>
                    <span className="font-mono font-bold text-sm text-neutral-200 mt-1 leading-none">{build.votes}</span>
                  </div>
                )}
                {build.upvotes != null && build.votes == null && (
                  <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 shrink-0">
                    <span className="text-amber-500 text-sm leading-none">▲</span>
                    <span className="font-mono font-bold text-sm text-neutral-200 mt-1 leading-none">{(build.upvotes?.length ?? build.upvotes ?? 0) - (build.downvotes?.length ?? build.downvotes ?? 0)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {filledItems.slice(0, 6).map((item, i) => (
                    <div key={i} className="w-7 h-7 relative rounded-lg border overflow-hidden bg-neutral-800 shrink-0"
                      style={{ borderColor: `${SLOT_COLOR[item.slot] ?? '#404040'}60` }}>
                      {item.images?.icon
                        ? <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />
                        : <div className="absolute inset-0 rounded-md" style={{ backgroundColor: `${SLOT_COLOR[item.slot] ?? '#404040'}20` }} />
                      }
                    </div>
                  ))}
                </div>
                <SlotBar items={build.items} />
                <span className="text-amber-400 font-mono font-bold text-sm ml-auto">
                  {build.totalCost?.toLocaleString()} <span className="text-neutral-600 font-normal text-xs">souls</span>
                </span>
              </div>

              <div className="flex items-end justify-between gap-4">
                {teaser && (
                  <p className="text-xs text-neutral-500 line-clamp-1 leading-relaxed flex-1 min-w-0">
                    {teaser.slice(0, 120)}…
                  </p>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <PhaseChips guide={build.guide} />
                  {build.video && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-950/60 text-red-400 border-red-900/50">
                      ▶ Video
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
