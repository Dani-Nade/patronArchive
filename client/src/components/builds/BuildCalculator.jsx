import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
function fmt(n) { return n >= 1000 ? `${n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)}k` : `${n}`; }

const SLOT_DOT = { weapon: 'bg-amber-500', vitality: 'bg-green-500', spirit: 'bg-purple-500' };
const SLOT_COLOR = { weapon: 'text-amber-400', vitality: 'text-green-400', spirit: 'text-purple-400' };
const SECTION_BADGE = {
  innate:  'bg-neutral-700 text-neutral-200',
  passive: 'bg-amber-900/60 text-amber-300',
  active:  'bg-blue-900/60 text-blue-300',
};

const THEME = {
  all:      { slot: '',         label: 'All',      tabActive: 'bg-teal-500 text-black',    panelBg: 'bg-teal-950/20 border-teal-800/30',    tabBarBg: 'bg-teal-950/50',    rowDivider: 'border-teal-900/20',    costAreaBg: 'bg-teal-950/40 border-teal-900/20',    costColor: 'text-teal-400',    cardBg: 'bg-teal-900/10 border-teal-800/20',    cardHover: 'hover:border-teal-400 hover:bg-teal-900/30',    searchFocus: 'focus:border-teal-700',    hudAccent: 'border-teal-500/30 shadow-teal-500/10',    publishBtn: 'bg-teal-500 hover:bg-teal-400 text-black' },
  weapon:   { slot: 'weapon',   label: 'Weapon',   tabActive: 'bg-amber-500 text-black',   panelBg: 'bg-amber-950/30 border-amber-800/40',  tabBarBg: 'bg-amber-950/60',   rowDivider: 'border-amber-900/30',   costAreaBg: 'bg-amber-950/50 border-amber-900/30',  costColor: 'text-amber-400',   cardBg: 'bg-amber-900/20 border-amber-800/30',  cardHover: 'hover:border-amber-400 hover:bg-amber-900/40',  searchFocus: 'focus:border-amber-700',   hudAccent: 'border-amber-500/30 shadow-amber-500/10',  publishBtn: 'bg-amber-500 hover:bg-amber-400 text-black' },
  vitality: { slot: 'vitality', label: 'Vitality', tabActive: 'bg-green-500 text-black',   panelBg: 'bg-green-950/30 border-green-800/40',  tabBarBg: 'bg-green-950/60',   rowDivider: 'border-green-900/30',   costAreaBg: 'bg-green-950/50 border-green-900/30',  costColor: 'text-green-400',   cardBg: 'bg-green-900/20 border-green-800/30',  cardHover: 'hover:border-green-400 hover:bg-green-900/40',  searchFocus: 'focus:border-green-700',   hudAccent: 'border-green-500/30 shadow-green-500/10',  publishBtn: 'bg-green-500 hover:bg-green-400 text-black' },
  spirit:   { slot: 'spirit',   label: 'Spirit',   tabActive: 'bg-purple-500 text-white',  panelBg: 'bg-purple-950/30 border-purple-800/40', tabBarBg: 'bg-purple-950/60',  rowDivider: 'border-purple-900/30',  costAreaBg: 'bg-purple-950/50 border-purple-900/30', costColor: 'text-purple-400',  cardBg: 'bg-purple-900/20 border-purple-800/30', cardHover: 'hover:border-purple-400 hover:bg-purple-900/40', searchFocus: 'focus:border-purple-700',  hudAccent: 'border-purple-500/30 shadow-purple-500/10', publishBtn: 'bg-purple-500 hover:bg-purple-400 text-white' },
};

function DeadlockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function ItemTooltip({ item, x, y }) {
  const slotColor = SLOT_COLOR[item.slot] ?? 'text-neutral-400';
  const slotLabel = item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
  const sections  = item.tooltipSections ?? [];

  const tooltipW = 288;
  const left = x + tooltipW > window.innerWidth - 8 ? x - tooltipW - 72 : x + 10;
  const top  = Math.min(y, window.innerHeight - 32);

  return createPortal(
    <div
      className="fixed z-[9999] w-72 rounded-xl border border-neutral-700 bg-neutral-950/95 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden pointer-events-none"
      style={{ left, top }}
    >
      <div className="flex items-center gap-3 p-3 border-b border-neutral-800 bg-neutral-900/60">
        {item.images?.icon && (
          <div className="w-11 h-11 relative rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-800">
            <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-neutral-100 text-sm leading-tight truncate">{item.name}</div>
          <div className={`text-xs font-medium mt-0.5 ${slotColor}`}>{slotLabel} · Tier {item.tier}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-teal-400 font-mono font-bold text-sm">{item.cost.toLocaleString()}</div>
          <div className="text-[10px] text-neutral-500">Souls</div>
        </div>
      </div>

      {item.activation && (
        <div className="px-3 pt-2.5 flex gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${SECTION_BADGE[item.activation] ?? 'bg-neutral-700 text-neutral-300'}`}>
            {item.activation}
          </span>
        </div>
      )}

      {sections.map((sec, si) => (
        <div key={si} className="px-3 pt-2.5">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${SECTION_BADGE[sec.type] ?? 'bg-neutral-700 text-neutral-300'}`}>
            {sec.type}
          </span>
          {sec.stats.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {sec.stats.map((stat, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-neutral-400">{stat.label}</span>
                  <span className={`font-mono font-bold ${slotColor}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
          {sec.desc && <p className="text-[11px] text-neutral-400 leading-relaxed mt-1.5">{sec.desc}</p>}
        </div>
      ))}

      {sections.length === 0 && item.description && (
        <p className="px-3 pt-2.5 text-[11px] text-neutral-400 leading-relaxed">{item.description}</p>
      )}
      <div className="h-3" />
    </div>,
    document.body
  );
}

export default function BuildCalculator({ heroes, items }) {
  const navigate = useNavigate();
  const [hero, setHero]       = useState(null);
  const [slots, setSlots]     = useState(Array(12).fill(null));
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState('all');
  const [tooltip, setTooltip] = useState(null);

  const th = THEME[tab];

  const addItem = (item) =>
    setSlots(prev => {
      if (prev.some(s => s?.id === item.id)) return prev;
      const idx = prev.findIndex(s => s === null);
      if (idx === -1) return prev;
      const next = [...prev]; next[idx] = item; return next;
    });

  const removeItem = (idx) =>
    setSlots(prev => { const n = [...prev]; n[idx] = null; return n; });

  const totalCost = slots.reduce((acc, s) => acc + (s?.cost ?? 0), 0);

  const showTooltip = useCallback((item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ item, x: rect.right, y: rect.top });
  }, []);

  const tierGroups = useMemo(() => {
    const pool = items
      .filter(i => tab === 'all' || i.slot === th.slot)
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
    const map = {};
    for (const i of pool) {
      const t = i.tier ?? 1;
      (map[t] ??= []).push(i);
    }
    return Object.entries(map)
      .sort(([a], [b]) => +a - +b)
      .map(([t, list]) => ({ tier: +t, minCost: Math.min(...list.map(i => i.cost)), list }));
  }, [items, tab, th.slot, search]);

  return (
    <>
      <div className={`rounded-xl border overflow-hidden transition-colors duration-300 ${th.panelBg}`}>
        <div className={`flex items-stretch border-b border-black/20 transition-colors duration-300 ${th.tabBarBg}`}>
          {Object.keys(THEME).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
              className={`px-6 py-3.5 font-bold text-sm uppercase tracking-widest border-r border-black/20 transition-all flex items-center gap-2 ${tab === t ? THEME[t].tabActive : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/5'}`}>
              {t === 'all' && <DeadlockIcon className="w-4 h-4" />}
              {THEME[t].label}
            </button>
          ))}
          <div className="flex-1 flex items-center justify-end px-5">
            <input type="text" placeholder="Search items..." value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-64 bg-black/30 border border-white/10 text-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder:text-neutral-600 ${th.searchFocus}`} />
          </div>
        </div>

        {tierGroups.length === 0
          ? <p className="text-center py-12 text-neutral-500 text-sm">{search ? `No items matching "${search}"` : 'No items available.'}</p>
          : tierGroups.map(({ tier, minCost, list }) => (
            <div key={tier} className={`flex border-b last:border-0 ${th.rowDivider}`}>
              <div className={`w-12 shrink-0 flex items-center justify-center border-r ${th.costAreaBg}`}>
                <span className={`text-[10px] font-mono font-bold tracking-wider select-none ${th.costColor}`}
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  $ {fmt(minCost)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5 p-3.5">
                {list.map(item => {
                  const selected = slots.some(s => s?.id === item.id);
                  return (
                  <button key={item.id}
                    onClick={() => addItem(item)}
                    onMouseEnter={e => showTooltip(item, e)}
                    onMouseLeave={() => setTooltip(null)}
                    title={item.name}
                    disabled={selected}
                    className={`w-[70px] flex flex-col items-center group focus:outline-none ${selected ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <div className={`w-14 h-14 relative rounded-lg border overflow-hidden transition-all ${selected ? 'border-teal-500/60 ring-1 ring-teal-500/40' : `${th.cardBg} ${th.cardHover}`}`}>
                      {item.images?.icon
                        ? <img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-0.5" />
                        : <span className="absolute inset-0 flex items-center justify-center text-neutral-600 text-xs">?</span>}
                      <span className="absolute top-0.5 right-0.5 text-[7px] leading-none font-bold text-neutral-300/70 bg-black/70 px-[3px] py-px rounded">
                        {ROMAN[tier - 1] ?? tier}
                      </span>
                      {tab === 'all' && <span className={`absolute bottom-0 left-0 right-0 h-[3px] ${SLOT_DOT[item.slot] ?? 'bg-neutral-500'}`} />}
                    </div>
                    <span className="text-[9px] text-center text-neutral-400 group-hover:text-neutral-100 mt-1.5 leading-tight w-full line-clamp-2 transition-colors">
                      {item.name}
                    </span>
                  </button>
                  );
                })}
              </div>
            </div>
          ))
        }
      </div>

      <div className="h-28" />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end pb-5 pointer-events-none">
        <div className={`pointer-events-auto flex items-center gap-5 bg-neutral-950/85 backdrop-blur-2xl border rounded-2xl px-6 py-3.5 shadow-2xl shadow-black/80 ring-1 ring-white/[0.04] transition-colors duration-300 ${th.hudAccent}`}>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-12 relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800 shrink-0">
              {hero?.images?.portrait
                ? <img src={hero.images.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover" />
                : <DeadlockIcon className="w-5 h-5 text-neutral-600 absolute inset-0 m-auto" />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-neutral-600 uppercase tracking-[0.15em] font-semibold">Hero</span>
              <select value={hero?.id ?? ''}
                onChange={e => setHero(heroes.find(h => h.id.toString() === e.target.value) ?? null)}
                className="bg-neutral-900 border border-neutral-700 text-neutral-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-500 min-w-[120px] cursor-pointer">
                <option value="" disabled>Select hero...</option>
                {heroes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          </div>

          <div className="w-px h-10 bg-white/[0.08] shrink-0" />

          <div className="flex gap-1.5">
            {slots.map((item, i) => (
              <button key={i} onClick={() => item && removeItem(i)}
                title={item ? `Remove ${item.name}` : `Slot ${i + 1}`}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all relative overflow-hidden ${item ? 'bg-neutral-800 border-neutral-600 hover:border-red-500/60 hover:bg-red-950/20' : 'bg-neutral-900/60 border-neutral-700/40 border-dashed opacity-50 hover:opacity-80'}`}>
                {item ? (
                  <>
                    {item.images?.icon
                      ? <div className="relative w-7 h-7"><img src={item.images.icon} alt={item.name} className="absolute inset-0 w-full h-full object-contain" /></div>
                      : <span className="text-neutral-300 text-[10px] font-bold">{item.name.slice(0, 2)}</span>}
                    <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${SLOT_DOT[item.slot] ?? 'bg-neutral-500'}`} />
                  </>
                ) : (
                  <span className="text-neutral-700 text-[9px] font-mono">{i + 1}</span>
                )}
              </button>
            ))}
          </div>

          <div className="w-px h-10 bg-white/[0.08] shrink-0" />

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-neutral-600 uppercase tracking-widest font-semibold">Souls</span>
              <span className="font-mono font-bold text-lg text-neutral-100 leading-none">{totalCost.toLocaleString()}</span>
            </div>
            <button
              disabled={!hero || slots.every(s => s === null)}
              onClick={() => {
                localStorage.setItem('draft_build', JSON.stringify({ hero, items: slots, totalCost }));
                navigate('/builds/publish');
              }}
              className={`font-bold text-xs px-5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap ${th.publishBtn}`}>
              Publish Build
            </button>
          </div>
        </div>
      </div>

      {tooltip && <ItemTooltip {...tooltip} />}
    </>
  );
}
