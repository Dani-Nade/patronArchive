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
    <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 px-4 sm:px-8 pt-8 pb-16 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-neutral-800 pb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Community <span className="text-teal-400">Builds</span>
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Discover top-rated builds crafted by the community.
            </p>
          </div>
          <Link to="/builds/create"
            className="self-start sm:self-auto bg-teal-500 hover:bg-teal-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0">
            + Create Build
          </Link>
        </header>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by title, hero, or author…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:flex-1 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/40 placeholder:text-neutral-600"
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
