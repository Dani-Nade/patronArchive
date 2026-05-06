import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api.js';

const SLOT_COLOR = { weapon: '#f59e0b', vitality: '#22c55e', spirit: '#a855f7' };

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function BuildCard({ build, rank }) {
  const id  = build._id ?? build.id;
  const net = (build.upvotes?.length ?? 0) - (build.downvotes?.length ?? 0);

  return (
    <Link to={`/builds/${id}`}
      className="relative bg-neutral-900 border border-neutral-800 hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.08)] rounded-2xl p-4 transition-all group">

      {rank <= 3 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shadow-lg"
          style={{ background: rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : '#b45309', color: '#000' }}>
          #{rank}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-neutral-100 group-hover:text-teal-300 transition-colors leading-snug text-sm line-clamp-2">
            {build.title}
          </h3>
          <p className="text-[11px] text-neutral-600 mt-1">
            by <span className="text-neutral-400">{build.author?.name ?? 'Unknown'}</span>
            {' · '}{timeAgo(build.createdAt)}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 min-w-[44px]">
          <span className="text-amber-500 text-xs">▲</span>
          <span className="font-mono font-bold text-sm leading-none" style={{ color: net >= 0 ? '#fbbf24' : '#f87171' }}>{net}</span>
        </div>
      </div>

      {/* Items */}
      {(build.items ?? []).filter(Boolean).length > 0 && (
        <div className="flex gap-1 mb-3">
          {build.items.slice(0, 9).map((item, i) => (
            <div key={i} className="w-6 h-6 relative rounded bg-neutral-800 border overflow-hidden shrink-0"
              style={{ borderColor: `${SLOT_COLOR[item.slot] ?? '#404040'}50` }}>
              {item.images?.icon
                ? <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-px" />
                : <div className="absolute inset-0" style={{ backgroundColor: `${SLOT_COLOR[item.slot] ?? '#404040'}20` }} />}
            </div>
          ))}
          {build.items.length > 9 && (
            <span className="text-[10px] text-neutral-600 self-center ml-1">+{build.items.length - 9}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {build.role && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
            {build.role}
          </span>
        )}
        {build.patch && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
            Patch {build.patch}
          </span>
        )}
        {build.video && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-900/40">
            ▶ Video
          </span>
        )}
        {build.guide?.early && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-400 border border-teal-900/40">
            Full Guide
          </span>
        )}
      </div>
    </Link>
  );
}

function VideoCard({ video }) {
  return (
    <a href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank" rel="noopener noreferrer"
      className="bg-neutral-900 border border-neutral-800 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.08)] rounded-2xl overflow-hidden transition-all group">
      <div className="aspect-video bg-neutral-800 relative overflow-hidden">
        {video.thumbnail && (
          <img src={video.thumbnail} alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <span className="text-white text-base ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-neutral-100 group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
          {video.title}
        </p>
        <p className="text-[10px] text-neutral-600 mt-1.5 truncate">{video.channel}</p>
      </div>
    </a>
  );
}

function StatPill({ label, value, color = 'text-teal-400' }) {
  return (
    <div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
}

export default function HeroDetailPage() {
  const { name }    = useParams();
  const heroName    = decodeURIComponent(name ?? '');

  const [hero,     setHero]     = useState(null);
  const [builds,   setBuilds]   = useState([]);
  const [videos,   setVideos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sortBy,   setSortBy]   = useState('top');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    Promise.allSettled([
      api.get('/heroes'),
      api.get(`/builds?hero=${encodeURIComponent(heroName)}&sort=top`),
      api.get(`/youtube?q=${encodeURIComponent(heroName + ' deadlock build guide')}`),
    ]).then(([heroRes, buildsRes, ytRes]) => {
      if (heroRes.status === 'fulfilled') {
        const list  = heroRes.value.data ?? [];
        const found = list.find(h => h.name.toLowerCase() === heroName.toLowerCase());
        setHero(found ?? null);
        if (!found) setNotFound(true);
      }
      if (buildsRes.status === 'fulfilled') {
        setBuilds(buildsRes.value.data.builds ?? []);
      }
      if (ytRes.status === 'fulfilled') {
        const data = ytRes.value.data;
        const items = Array.isArray(data) ? data : (data.items ?? []);
        setVideos(items.slice(0, 6));
      }
    }).finally(() => setLoading(false));
  }, [heroName]);

  const sorted = [...builds].sort((a, b) => {
    if (sortBy === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
    const netA = (a.upvotes?.length ?? 0) - (a.downvotes?.length ?? 0);
    const netB = (b.upvotes?.length ?? 0) - (b.downvotes?.length ?? 0);
    return netB - netA;
  });

  const topNet       = builds.length
    ? Math.max(...builds.map(b => (b.upvotes?.length ?? 0) - (b.downvotes?.length ?? 0)))
    : 0;
  const totalVotes   = builds.reduce((s, b) => s + (b.upvotes?.length ?? 0), 0);
  const withVideo    = builds.filter(b => b.video).length;

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm">Loading hero…</p>
      </div>
    </div>
  );

  /* ── Not found ── */
  if (notFound) return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl font-black text-neutral-800 mb-4">404</p>
        <p className="text-neutral-400 mb-4">Hero "{heroName}" not found.</p>
        <Link to="/heroes" className="text-teal-400 hover:underline text-sm font-bold">← Back to Hero Directory</Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 font-sans">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        {/* Blurred background portrait */}
        {hero?.images?.portrait && (
          <div className="absolute inset-0 overflow-hidden">
            <img src={hero.images.portrait} alt=""
              className="w-full h-full object-cover object-top opacity-15"
              style={{ filter: 'blur(32px)', transform: 'scale(1.2)' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a]/70 to-[#0a0a0a]" />

        <div className="relative px-4 sm:px-8 pt-10 pb-12 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-neutral-600 mb-6">
            <Link to="/" className="hover:text-neutral-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/heroes" className="hover:text-neutral-400 transition-colors">Heroes</Link>
            <span>/</span>
            <span className="text-neutral-400">{heroName}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 items-start">
            {/* Portrait card */}
            <div className="shrink-0 relative">
              <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-neutral-700 bg-neutral-800 shadow-2xl relative">
                {hero?.images?.portrait
                  ? <img src={hero.images.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
                  : <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-neutral-600">
                      {heroName.charAt(0)}
                    </div>}
              </div>
              <div className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-teal-500 border-2 border-[#0a0a0a] shadow" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
                {hero?.name ?? heroName}
              </h1>
              {hero?.role && (
                <p className="text-xs font-black uppercase tracking-widest text-teal-400 mt-2">{hero.role}</p>
              )}
              {hero?.description && (
                <p className="text-sm text-neutral-400 mt-3 max-w-xl leading-relaxed line-clamp-3">
                  {hero.description}
                </p>
              )}

              <div className="flex flex-wrap gap-8 mt-6">
                <StatPill label="Community Builds" value={builds.length} />
                <StatPill label="Top Score"         value={topNet}        color="text-amber-400" />
                <StatPill label="Total Upvotes"     value={totalVotes}    />
                <StatPill label="With Video"        value={withVideo}     color="text-red-400" />
              </div>
            </div>

            <Link to="/builds/create"
              className="shrink-0 self-start bg-teal-500 hover:bg-teal-400 text-black font-black px-5 py-2.5 rounded-xl transition-all text-sm active:scale-95">
              + Create Build
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-20 max-w-6xl mx-auto space-y-14">

        {/* ── Builds section ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {heroName} <span className="text-teal-400">Builds</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {builds.length} community {builds.length === 1 ? 'guide' : 'guides'} · click to view full build
              </p>
            </div>

            <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              {[{ id: 'top', label: '▲ Top Rated' }, { id: 'new', label: '✨ Newest' }].map(t => (
                <button key={t.id} onClick={() => setSortBy(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortBy === t.id
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {builds.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-neutral-300 font-bold">No builds yet for {heroName}</p>
              <p className="text-neutral-500 text-sm mt-1">Be the first to share a strategy.</p>
              <Link to="/builds/create"
                className="mt-4 inline-block bg-teal-500 hover:bg-teal-400 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-all">
                Create the First Build →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((b, i) => <BuildCard key={b._id ?? b.id} build={b} rank={i + 1} />)}
            </div>
          )}
        </section>

        {/* ── YouTube videos section ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Video <span className="text-red-400">Guides</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 bg-red-950/60 border border-red-900/40 text-red-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              <span className="text-xs">▶</span> YouTube
            </span>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <p className="text-neutral-500 text-sm">No videos found for {heroName}.</p>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(heroName + ' deadlock guide')}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-block text-red-400 hover:underline text-sm font-bold">
                Search YouTube manually →
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v, i) => <VideoCard key={i} video={v} />)}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
