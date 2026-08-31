import { useEffect, useState } from 'react';
import api from '../../lib/api.js';

/* ── SVG Area Chart ─────────────────────────────────────────── */
function AreaChart({ data, color, label, height = 64 }) {
  const W = 300, H = height;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.count / max) * (H - 6);
    return [x, y];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area     = `0,${H} ${polyline} ${W},${H}`;

  return (
    <div>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">{label}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area}     fill={`url(#g-${color.replace('#', '')})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[7px] text-neutral-700 font-mono">{d.date?.slice(5) ?? ''}</span>
        ))}
      </div>
    </div>
  );
}

/* ── SVG Donut / Ring Chart ─────────────────────────────────── */
function DonutChart({ pct, color, size = 80, warn = false }) {
  const r        = 28;
  const circ     = 2 * Math.PI * r;
  const filled   = Math.min(pct, 100);
  const offset   = circ - (filled / 100) * circ;
  const trackCol = warn ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)';

  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke={trackCol} strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color}    strokeWidth="9"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="900" fontFamily="monospace">
        {Math.round(filled)}%
      </text>
    </svg>
  );
}

/* ── Bar Spark ──────────────────────────────────────────────── */
function BarSpark({ data, color }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-px">
            <div className="w-full rounded-t transition-all"
              style={{ height: `${Math.max(pct, 3)}%`, backgroundColor: color, opacity: d.count ? 0.85 : 0.12 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Stat Tile ──────────────────────────────────────────────── */
function StatTile({ value, label, color = 'text-teal-400', sub }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-1">
      <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
      <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">{label}</p>
      {sub && <p className="text-[10px] text-neutral-700 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

const API_META = {
  youtube:     { label: 'YouTube Data API v3',  color: '#ef4444', quota: 10000 },
  sightengine: { label: 'Sightengine Text API',  color: '#8b5cf6', quota: 2000  },
};

export default function AdminHealth() {
  const [health,      setHealth]      = useState(null);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [patchInfo,   setPatchInfo]   = useState(null);
  const [patchInput,  setPatchInput]  = useState('');
  const [patchSaving, setPatchSaving] = useState(false);
  const [patchMsg,    setPatchMsg]    = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/admin/health'),
      api.get('/admin/stats'),
      api.get('/patch'),
    ]).then(([healthRes, statsRes, patchRes]) => {
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (statsRes.status  === 'fulfilled') setStats(statsRes.value.data.stats);
      if (patchRes.status  === 'fulfilled') {
        setPatchInfo(patchRes.value.data);
        setPatchInput(patchRes.value.data.patch ?? '');
      }
    }).finally(() => setLoading(false));
  }, []);

  const savePatch = async () => {
    setPatchSaving(true); setPatchMsg('');
    try {
      const r = await api.put('/admin/patch', { version: patchInput });
      setPatchInfo(r.data);
      setPatchMsg('Patch updated.');
    } catch (e) {
      setPatchMsg(e.response?.data?.error ?? 'Failed.');
    } finally {
      setPatchSaving(false);
      setTimeout(() => setPatchMsg(''), 3500);
    }
  };

  const forceRefresh = async () => {
    setPatchSaving(true); setPatchMsg('');
    try {
      const r = await api.put('/admin/patch', { forceRefresh: true });
      setPatchInfo(r.data); setPatchInput(r.data.patch ?? '');
      setPatchMsg(r.data.source === 'steam' ? `Auto-detected: ${r.data.patch}` : 'No update from Steam.');
    } catch {
      setPatchMsg('Refresh failed.');
    } finally {
      setPatchSaving(false);
      setTimeout(() => setPatchMsg(''), 4000);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm animate-pulse">Loading health data…</p>
      </div>
    </div>
  );

  if (!health) return (
    <div className="text-center py-20 text-red-400 text-sm">Failed to load health data.</div>
  );

  const { apis, uptimeMs } = health;

  /* Build activity chart from admin stats */
  const last7Days = (stats?.last7Days ?? []).map((count, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), count };
  });

  const reportedTotal = (stats?.reportedBuilds ?? 0) + (stats?.reportedComments ?? 0);

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Page heading ── */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">System Health</h1>
        <p className="text-sm text-neutral-500 mt-1">API usage, quotas, content analytics, and server status</p>
      </div>

      {/* ── Server status ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center gap-5">
        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)] shrink-0 animate-pulse" />
        <div className="flex-1">
          <p className="font-black text-neutral-200">Server Online</p>
          <p className="text-xs text-neutral-500 mt-0.5">Uptime: {fmtUptime(uptimeMs)}</p>
        </div>
        <div className="text-right text-[10px] text-neutral-600 font-mono space-y-0.5">
          <p className="uppercase tracking-widest">Node.js · Express</p>
          <p className="uppercase tracking-widest">MongoDB Atlas</p>
        </div>
      </div>

      {/* ── Content Analytics ── */}
      {stats && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-black text-neutral-200 text-lg">Content Analytics</p>
              <p className="text-xs text-neutral-500 mt-0.5">Platform-wide content stats and recent activity</p>
            </div>
            {reportedTotal > 0 && (
              <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-900/40 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl">
                <span>⚠</span>
                <span>{reportedTotal} pending reports</span>
              </div>
            )}
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile value={stats.totalUsers}    label="Total Users"    color="text-teal-400"  />
            <StatTile value={stats.totalBuilds}   label="Total Builds"   color="text-amber-400" />
            <StatTile value={stats.totalComments} label="Comments"       color="text-violet-400"/>
            <StatTile value={reportedTotal}       label="Pending Reports" color={reportedTotal > 0 ? 'text-red-400' : 'text-neutral-500'} />
          </div>

          {/* Builds per day area chart */}
          {last7Days.length > 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Builds Created — Last 7 Days</p>
                <p className="text-sm font-black text-teal-400">
                  {last7Days.reduce((s, d) => s + d.count, 0)} total
                </p>
              </div>
              <AreaChart data={last7Days} color="#14b8a6" height={72} />
            </div>
          )}
        </div>
      )}

      {/* ── Game Patch ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black text-neutral-200">Game Patch Version</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {patchInfo
                ? `Source: ${patchInfo.source} · Last checked: ${patchInfo.lastChecked ? new Date(patchInfo.lastChecked).toLocaleString() : 'never'}`
                : 'Loading…'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-teal-400 font-mono">{patchInfo?.patch ?? '—'}</p>
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mt-0.5">current</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" value={patchInput} onChange={e => setPatchInput(e.target.value)}
            placeholder="e.g. 1.6"
            className="w-28 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500/40" />
          <button onClick={savePatch} disabled={patchSaving}
            className="text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            Set Manually
          </button>
          <button onClick={forceRefresh} disabled={patchSaving}
            className="text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
            {patchSaving ? '…' : '↻ Auto-detect'}
          </button>
          {patchMsg && <span className="text-xs text-teal-400">{patchMsg}</span>}
        </div>
      </div>

      {/* ── API usage cards ── */}
      {Object.entries(API_META).map(([key, meta]) => {
        const data = apis[key];

        if (!data) return (
          <div key={key} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
              <p className="font-black text-neutral-400">{meta.label}</p>
            </div>
            <p className="text-xs text-neutral-600">No calls recorded yet.</p>
          </div>
        );

        const todayPct  = Math.min((data.today / meta.quota) * 100, 100);
        const warn      = todayPct > 80;
        const statusCol = warn ? '#ef4444' : meta.color;

        return (
          <div key={key} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}60` }} />
                <div>
                  <p className="font-black text-neutral-200">{meta.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Daily quota: {meta.quota.toLocaleString()} units</p>
                </div>
              </div>
              {warn && (
                <span className="text-[10px] font-black text-red-400 bg-red-950/60 border border-red-900/40 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  ⚠ Near limit
                </span>
              )}
            </div>

            {/* Donut + stats grid */}
            <div className="flex items-center gap-6">
              <DonutChart pct={todayPct} color={statusCol} size={88} warn={warn} />
              <div className="grid grid-cols-3 gap-3 flex-1">
                <StatTile value={data.today}  label="Today"      color={warn ? 'text-red-400' : `text-[${meta.color}]`}
                  sub={`${todayPct.toFixed(1)}% used`} />
                <StatTile value={data.total}  label="All Time"   color="text-neutral-300" />
                <StatTile value={data.errors} label="Errors"     color={data.errors > 0 ? 'text-red-400' : 'text-neutral-600'} />
              </div>
            </div>

            {/* Quota progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>Daily Usage</span>
                <span style={{ color: statusCol }}>{data.today.toLocaleString()} / {meta.quota.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${todayPct}%`, backgroundColor: statusCol }} />
              </div>
            </div>

            {/* Area chart for last 7 days */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <AreaChart data={data.last7} color={meta.color} label="Last 7 Days" height={60} />
            </div>

            {/* Spark mini-bar + peak day callout */}
            {(() => {
              const peak = [...data.last7].sort((a, b) => b.count - a.count)[0];
              return peak?.count > 0 ? (
                <div className="flex items-center justify-between text-[10px] text-neutral-600">
                  <span>Peak day: <span className="text-neutral-400 font-bold">{peak.date?.slice(5)}</span></span>
                  <span style={{ color: meta.color }} className="font-bold">{peak.count} calls</span>
                </div>
              ) : null;
            })()}
          </div>
        );
      })}
    </div>
  );
}
