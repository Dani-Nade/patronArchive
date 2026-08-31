import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BuildsList from '../components/builds/BuildsList.jsx';
import api from '../lib/api.js';

const ROLE_FILTERS = ['', 'carry', 'support', 'bruiser', 'tank', 'assassin'];
const BASE_PATCHES = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5'];

function sortedPatches(arr) {
  return [...arr].sort((a, b) => {
    const [am, an = 0, ap = 0] = a.split('.').map(Number);
    const [bm, bn = 0, bp = 0] = b.split('.').map(Number);
    return am !== bm ? am - bm : an !== bn ? an - bn : ap - bp;
  });
}

export default function BuildsPage() {
  const [search, setSearch]         = useState('');
  const [role, setRole]             = useState('');
  const [sort, setSort]             = useState('');
  const [patch, setPatch]           = useState('');
  const [patchOptions, setPatchOptions] = useState(BASE_PATCHES);
  const [currentPatch, setCurrentPatch] = useState('');

  useEffect(() => {
    api.get('/patch').then(r => {
      const latest = r.data.patch;
      setCurrentPatch(latest);
      setPatchOptions(prev => {
        const merged = sortedPatches([...new Set([...prev, latest])]);
        return merged;
      });
    }).catch(() => {});
  }, []);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-neutral-950 text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-5xl mx-auto relative">
        <span className="font-display text-[7rem] leading-none text-stroke-cream absolute -right-6 -top-4 rotate-[-3deg] select-none pointer-events-none whitespace-nowrap hidden md:block" aria-hidden="true">
          BUILDS
        </span>
        <header className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-neutral-800 pb-6">
          <div>
            <p className="eyebrow mb-2">Top-rated loadouts, curated by the community</p>
            <h1 className="font-display text-5xl sm:text-6xl text-neutral-100 leading-none">
              Community <span className="text-amber-400">Builds</span>
            </h1>
          </div>
          <Link to="/builds/create"
            className="self-start sm:self-auto bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0">
            + Create Build
          </Link>
        </header>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by title, hero, or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:flex-1 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
          />
          <select value={role} onChange={e => setRole(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
            {ROLE_FILTERS.map(r => (
              <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All Roles'}</option>
            ))}
          </select>
          <select value={patch} onChange={e => setPatch(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
            <option value="">All Patches</option>
            {patchOptions.map(p => (
              <option key={p} value={p}>
                {`Patch ${p}`}{p === currentPatch ? ' (Current)' : ''}
              </option>
            ))}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
            <option value="">Newest</option>
            <option value="top">Top Rated</option>
          </select>
        </div>

        <BuildsList search={search} role={role} sort={sort} patch={patch} />
      </div>
    </main>
  );
}
