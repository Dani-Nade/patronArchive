import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';

const TS_COLORS = [
  'bg-amber-500/20 border-amber-500/50 text-amber-300',
  'bg-teal-500/20 border-teal-500/50 text-teal-300',
  'bg-purple-500/20 border-purple-500/50 text-purple-300',
  'bg-green-500/20 border-green-500/50 text-green-300',
  'bg-blue-500/20 border-blue-500/50 text-blue-300',
  'bg-rose-500/20 border-rose-500/50 text-rose-300',
];

const SLOT_BORDER = {
  weapon: 'border-amber-500/30', vitality: 'border-green-500/30', spirit: 'border-purple-500/30',
};

function extractVideoId(url) {
  for (const p of [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /embed\/([^?&#]+)/]) {
    const m = url.match(p); if (m) return m[1];
  }
  return null;
}

function toSeconds(str) {
  const p = str.split(':').map(Number);
  if (p.some(isNaN) || p.length < 2) return 0;
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}

const GUIDE_PHASES = [
  { key: 'early', label: 'Early Game', color: 'text-green-400',  focusBorder: 'focus:border-green-500/40',  dot: 'bg-green-500'  },
  { key: 'mid',   label: 'Mid Game',   color: 'text-amber-400',  focusBorder: 'focus:border-amber-500/40',  dot: 'bg-amber-500'  },
  { key: 'late',  label: 'End Game',   color: 'text-red-400',    focusBorder: 'focus:border-red-500/40',    dot: 'bg-red-500'    },
];

const ROLES = ['carry', 'support', 'bruiser', 'tank', 'assassin'];

export default function PublishForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft]           = useState(null);
  const [title, setTitle]           = useState('');
  const [role, setRole]             = useState('carry');
  const [patch, setPatch]           = useState('1.5');
  const [patchOptions, setPatchOptions] = useState(['1.0','1.1','1.2','1.3','1.4','1.5']);
  const [guide, setGuide]           = useState({ early: '', mid: '', late: '' });
  const [videoQuery, setVideoQuery] = useState('');
  const [videoInfo, setVideoInfo]   = useState(null);
  const [results, setResults]       = useState([]);
  const [vLoading, setVLoading]     = useState(false);
  const [vError, setVError]         = useState('');
  const [timestamps, setTimestamps] = useState([]);
  const [tsTime, setTsTime]         = useState('');
  const [tsLabel, setTsLabel]       = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [flagWarning, setFlagWarning] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('draft_build');
    if (raw) setDraft(JSON.parse(raw));
  }, []);

  useEffect(() => {
    api.get('/patch').then(r => {
      const latest = r.data.patch;
      setPatch(latest);
      setPatchOptions(prev => {
        const merged = [...new Set([...prev, latest])].sort((a, b) => {
          const [am, an = 0] = a.split('.').map(Number);
          const [bm, bn = 0] = b.split('.').map(Number);
          return am !== bm ? am - bm : an - bn;
        });
        return merged;
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const vid = extractVideoId(videoQuery);
    if (!vid) { if (!videoQuery) { setVideoInfo(null); setResults([]); } return; }
    setVLoading(true); setVError(''); setResults([]);
    api.get(`/youtube?videoId=${vid}`)
      .then(r => r.data.id ? setVideoInfo(r.data) : setVError('Video not found.'))
      .catch(() => setVError('Failed to load video.'))
      .finally(() => setVLoading(false));
  }, [videoQuery]);

  const handleSearch = async () => {
    if (!videoQuery.trim() || extractVideoId(videoQuery)) return;
    setVLoading(true); setVError('');
    try {
      const r = await api.get(`/youtube?q=${encodeURIComponent(videoQuery)}`);
      setResults(r.data);
    } catch { setVError('Search failed.'); }
    finally { setVLoading(false); }
  };

  const pickVideo = (v) => { setVideoInfo(v); setResults([]); setVideoQuery(`https://youtube.com/watch?v=${v.id}`); };

  const addTimestamp = () => {
    if (!tsTime.trim() || !tsLabel.trim()) return;
    const color = TS_COLORS[timestamps.length % TS_COLORS.length];
    setTimestamps(p => [...p, { time: tsTime, seconds: toSeconds(tsTime), label: tsLabel, color }]);
    setTsTime(''); setTsLabel('');
  };

  const buildBody = (bypass = false) => ({
    title: title.trim() || `${draft.hero.name} Build Guide`,
    role, patch, hero: draft.hero,
    items: draft.items.filter(Boolean),
    totalCost: draft.totalCost,
    guide,
    video: videoInfo ? { ...videoInfo, timestamps } : null,
    ...(bypass && { bypass: true }),
  });

  const submitBuild = async (bypass = false) => {
    if (!draft) return;
    setPublishError(''); setFlagWarning(null); setPublishing(true);
    try {
      if (user) {
        const r = await api.post('/builds', buildBody(bypass));
        localStorage.removeItem('draft_build');
        navigate(`/builds/${r.data.build._id}`);
      } else {
        const body = buildBody();
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const local = { ...body, id, _id: id, createdAt: new Date().toISOString(), author: { name: 'Guest' } };
        const all = JSON.parse(localStorage.getItem('published_builds') || '{}');
        all[id] = local;
        localStorage.setItem('published_builds', JSON.stringify(all));
        localStorage.removeItem('draft_build');
        navigate(`/builds/${id}`);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.flagged) { setFlagWarning(data.words ?? []); }
      else { setPublishError(data?.error ?? 'Failed to publish build.'); }
      setPublishing(false);
    }
  };

  const handlePublish = () => submitBuild(false);

  if (!draft) return (
    <p className="text-center py-20 text-neutral-500">
      No build found.{' '}
      <a href="/builds/create" className="text-teal-400 hover:underline">Go create one first.</a>
    </p>
  );

  const filledItems = draft.items.filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center gap-5">
        <div className="w-12 h-16 relative rounded-xl overflow-hidden border border-neutral-700 shrink-0">
          {draft.hero.images?.portrait && <img src={draft.hero.images.portrait} alt={draft.hero.name} className="absolute inset-0 w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-neutral-100 text-lg">{draft.hero.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filledItems.map((item, i) => (
              <div key={i} className={`w-8 h-8 relative rounded-lg bg-neutral-800 border overflow-hidden ${SLOT_BORDER[item.slot] ?? 'border-neutral-700'}`}>
                {item.images?.icon && <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />}
              </div>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-teal-400 text-lg">{draft.totalCost.toLocaleString()}</p>
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Souls</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Build Title</label>
        <input type="text" placeholder={`${draft.hero.name} Build Guide`} value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600" />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Role</label>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors ${role === r ? 'bg-teal-500 border-teal-500 text-black' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Game Patch</label>
        <div className="flex gap-2 flex-wrap">
          {patchOptions.map(p => (
            <button key={p} type="button" onClick={() => setPatch(p)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${patch === p ? 'bg-teal-500 border-teal-500 text-black' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Build Guide <span className="normal-case text-neutral-700 font-normal">(fill any or all)</span></p>
        {GUIDE_PHASES.map(({ key, label, color, focusBorder, dot }) => (
          <div key={key} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className={`font-bold text-[11px] uppercase tracking-widest ${color}`}>{label}</span>
            </div>
            <textarea rows={3} placeholder={`Tips for ${label.toLowerCase()}...`}
              value={guide[key]} onChange={e => setGuide(p => ({ ...p, [key]: e.target.value }))}
              className={`w-full bg-transparent text-sm text-neutral-300 px-4 py-3 resize-none focus:outline-none placeholder:text-neutral-700 ${focusBorder}`} />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Video Guide <span className="normal-case text-neutral-700 font-normal">(optional)</span></p>
        <div className="flex gap-2">
          <input type="text" placeholder="Paste YouTube URL or type a search query…"
            value={videoQuery} onChange={e => setVideoQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600/40 placeholder:text-neutral-600" />
          <button onClick={handleSearch} disabled={vLoading || !!extractVideoId(videoQuery)}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs px-5 rounded-xl transition-colors">
            {vLoading ? '…' : 'Search'}
          </button>
        </div>
        {vError && <p className="text-red-400 text-xs">{vError}</p>}

        {results.length > 0 && !videoInfo && (
          <div className="space-y-2 rounded-xl overflow-hidden border border-neutral-800">
            {results.map(v => (
              <button key={v.id} onClick={() => pickVideo(v)}
                className="w-full flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 p-3 text-left transition-colors group border-b border-neutral-800 last:border-0">
                <img src={v.thumbnail} alt={v.title} width={96} height={54} className="rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 group-hover:text-teal-400 line-clamp-2 transition-colors">{v.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{v.channel}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {videoInfo && (
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
            <img src={videoInfo.thumbnail} alt={videoInfo.title} width={96} height={54} className="rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-100 line-clamp-1">{videoInfo.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{videoInfo.channel}</p>
            </div>
            <button onClick={() => { setVideoInfo(null); setVideoQuery(''); setTimestamps([]); }}
              className="text-neutral-600 hover:text-red-400 transition-colors text-sm shrink-0">✕</button>
          </div>
        )}
      </div>

      {videoInfo && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Timestamps</p>
          <div className="flex gap-2">
            <input type="text" placeholder="0:00" value={tsTime} onChange={e => setTsTime(e.target.value)}
              className="w-20 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:border-teal-500/40" />
            <input type="text" placeholder="Label (e.g. First Fight)" value={tsLabel}
              onChange={e => setTsLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTimestamp()}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600" />
            <button onClick={addTimestamp}
              className="bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs px-4 rounded-xl transition-colors">+ Add</button>
          </div>
          {timestamps.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {timestamps.map((ts, i) => (
                <span key={i} className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs ${ts.color}`}>
                  <span className="font-mono font-bold">{ts.time}</span>
                  <span>{ts.label}</span>
                  <button onClick={() => setTimestamps(p => p.filter((_, j) => j !== i))}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {flagWarning && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 space-y-3">
          <p className="font-bold text-amber-400 text-sm">⚠ Content Warning</p>
          <p className="text-sm text-neutral-300">Our system flagged the following words in your build:</p>
          <div className="flex flex-wrap gap-2">
            {flagWarning.map((w, i) => (
              <span key={i} className="bg-red-950/50 border border-red-800/50 text-red-400 font-mono text-xs px-2.5 py-1 rounded-full">{w}</span>
            ))}
          </div>
          <p className="text-xs text-neutral-500">Posting anyway will flag your build for admin review.</p>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setFlagWarning(null)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm py-2.5 rounded-xl transition-colors">
              Edit Build
            </button>
            <button onClick={() => submitBuild(true)} disabled={publishing}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-sm py-2.5 rounded-xl transition-colors">
              Post Anyway
            </button>
          </div>
        </div>
      )}

      {publishError && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">{publishError}</p>}

      <button onClick={handlePublish} disabled={publishing || !!flagWarning}
        className="w-full bg-teal-500 hover:bg-teal-400 active:scale-[0.99] disabled:opacity-40 text-black font-black text-base py-4 rounded-2xl transition-all">
        {publishing ? 'Publishing…' : 'Publish Build Guide →'}
      </button>
    </div>
  );
}
