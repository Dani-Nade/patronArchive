import { useEffect, useState } from 'react';
import api from '../../lib/api.js';

const SLOT_COLOR = { weapon: '#f59e0b', vitality: '#22c55e', spirit: '#a855f7' };

export default function AdminItems() {
  const [heroes, setHeroes]     = useState([]);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('heroes');
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const load = (bust = false) => {
    setLoading(true);
    const ts = bust ? `?bust=${Date.now()}` : '';
    Promise.all([
      api.get(`/heroes${ts}`).then(r => setHeroes(r.data)).catch(() => {}),
      api.get(`/items${ts}`).then(r => setItems(r.data)).catch(() => {}),
    ]).finally(() => { setLoading(false); setLastSync(new Date().toLocaleTimeString()); });
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    load(true);
    setRefreshing(false);
  };

  const filteredHeroes = heroes.filter(h => !search || h.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredItems  = items.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Hero & Item Database</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Data is sourced from the Deadlock game API and cached server-side.
            {lastSync && <span className="text-neutral-600"> · Last sync: {lastSync}</span>}
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="self-start sm:self-auto bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
          {refreshing ? 'Refreshing…' : '↻ Force Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-4xl font-black text-teal-400">{heroes.length}</span>
          <div>
            <p className="font-bold text-neutral-200">Heroes</p>
            <p className="text-xs text-neutral-500">Playable characters</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-4xl font-black text-amber-400">{items.length}</span>
          <div>
            <p className="font-bold text-neutral-200">Items</p>
            <p className="text-xs text-neutral-500">Across all slots &amp; tiers</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ key: 'heroes', label: `Heroes (${heroes.length})` }, { key: 'items', label: `Items (${items.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${tab === t.key ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'text-neutral-400 border-neutral-800 hover:text-neutral-100'}`}>
            {t.label}
          </button>
        ))}
        <input
          type="text"
          placeholder={`Search ${tab}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-auto sm:ml-auto bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500 animate-pulse">Loading data…</div>
      ) : tab === 'heroes' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredHeroes.map(h => (
            <div key={h.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex items-center gap-3 p-3">
              <div className="w-10 h-12 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800 relative shrink-0">
                {h.images?.portrait && <img src={h.images.portrait} alt={h.name} className="absolute inset-0 w-full h-full object-cover object-top" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-neutral-200 truncate text-sm">{h.name}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{h.role ?? 'Hero'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Item</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden md:table-cell">Slot</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden md:table-cell">Tier</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.slice(0, 100).map(item => (
                <tr key={item.id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden relative shrink-0">
                        {item.images?.icon && <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />}
                      </div>
                      <span className="font-bold text-neutral-200">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-xs font-bold capitalize" style={{ color: SLOT_COLOR[item.slot] ?? '#6b7280' }}>{item.slot}</span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-neutral-500 text-xs">T{item.tier}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-teal-400 text-sm">{item.cost?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length > 100 && (
            <p className="text-center py-3 text-xs text-neutral-500">Showing 100 of {filteredItems.length} items. Use search to narrow results.</p>
          )}
        </div>
      )}
    </div>
  );
}
