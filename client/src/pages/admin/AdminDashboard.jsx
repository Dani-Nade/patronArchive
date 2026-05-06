import { useEffect, useState } from 'react';
import api from '../../lib/api.js';

function StatCard({ label, value, sub, color = 'text-teal-400' }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">{label}</p>
      <p className={`text-4xl font-black ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-neutral-600 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, label, color = '#14b8a6' }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">{label}</p>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-neutral-600 font-mono">{d.count || ''}</span>
              <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: d.count ? 1 : 0.15 }} />
              <span className="text-[8px] text-neutral-700 font-mono">{d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data.stats))
      .catch(e => setError(e.response?.data?.error ?? 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-neutral-500 animate-pulse">Loading dashboard…</div>;
  if (error)   return <div className="text-center py-20 text-red-400 text-sm">{error}</div>;

  const chartData = stats.last7Days.map((count, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), count };
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.totalUsers}    color="text-teal-400" />
        <StatCard label="Total Builds"   value={stats.totalBuilds}   color="text-amber-400" />
        <StatCard label="Total Comments" value={stats.totalComments} color="text-blue-400" />
        <StatCard label="Open Reports"   value={stats.reportedBuilds + stats.reportedComments}
          sub={`${stats.reportedBuilds} builds · ${stats.reportedComments} comments`}
          color={stats.reportedBuilds + stats.reportedComments > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <BarChart data={chartData} label="Builds Created — Last 7 Days" color="#14b8a6" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Quick Links</p>
          <div className="space-y-2">
            {[
              { href: '/admin/users',   label: 'Manage Users',          icon: '👤' },
              { href: '/admin/reports', label: 'Review Reports',         icon: '⚑' },
              { href: '/admin/health',  label: 'Check System Health',    icon: '◎' },
              { href: '/builds',        label: 'Browse All Builds',      icon: '📋' },
            ].map(l => (
              <a key={l.href} href={l.href}
                className="flex items-center gap-3 px-4 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-teal-500/40 rounded-xl text-sm text-neutral-300 hover:text-teal-300 transition-all">
                <span>{l.icon}</span>
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">Platform Health</p>
          <div className="space-y-3">
            {[
              { label: 'Reported Builds',   value: stats.reportedBuilds,   warn: stats.reportedBuilds > 0 },
              { label: 'Reported Comments', value: stats.reportedComments, warn: stats.reportedComments > 0 },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">{r.label}</span>
                <span className={`font-mono font-bold text-sm ${r.warn ? 'text-red-400' : 'text-green-400'}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
