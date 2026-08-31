import { useEffect, useState } from 'react';
import api from '../../lib/api.js';

function timeAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d < 7)   return `${d}d ago`;
  if (d < 30)  return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function AdminUsers() {
  const [users, setUsers]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/admin/users${params}`)
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const suspend = async (id, suspended) => {
    setActionId(id);
    try {
      await api.put(`/admin/users/${id}/suspend`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, suspended: !suspended } : u));
    } finally { setActionId(null); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user and all their content? This cannot be undone.')) return;
    setActionId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      setTotal(t => t - 1);
    } finally { setActionId(null); }
  };

  const toggleRole = async (id, currentRole) => {
    const promoting = currentRole !== 'admin';
    const msg = promoting
      ? 'Grant admin privileges to this user?'
      : 'Revoke admin privileges from this user?';
    if (!confirm(msg)) return;
    setActionId(id);
    try {
      const r = await api.put(`/admin/users/${id}/role`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: r.data.role } : u));
    } finally { setActionId(null); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-sm text-neutral-500 mt-1">{total} total users</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
      />

      {loading ? (
        <div className="text-center py-12 text-neutral-500 animate-pulse">Loading users…</div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">User</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden lg:table-cell">Joined</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hidden lg:table-cell">Strikes</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden relative shrink-0">
                        {u.avatar
                          ? <img src={u.avatar} alt={u.name} className="absolute inset-0 w-full h-full object-cover" />
                          : <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-teal-400">{u.name?.charAt(0)}</span>}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-200 leading-tight">{u.name}</p>
                        <p className="text-[11px] text-neutral-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-amber-950/60 text-amber-400 border-amber-900/50' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-neutral-500 text-xs">{timeAgo(u.createdAt)}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className={`text-xs font-bold ${(u.strikes ?? 0) >= 3 ? 'text-red-400' : (u.strikes ?? 0) >= 2 ? 'text-amber-400' : 'text-neutral-600'}`}>
                      {u.strikes ?? 0}/3
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${u.suspended ? 'bg-red-950/60 text-red-400 border-red-900/50' : 'bg-green-950/60 text-green-400 border-green-900/50'}`}>
                      {u.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => toggleRole(u._id, u.role)}
                        disabled={actionId === u._id}
                        title={u.role === 'admin' ? 'Revoke admin privileges' : 'Grant admin privileges'}
                        className={`text-xs font-medium transition-colors disabled:opacity-40 ${
                          u.role === 'admin'
                            ? 'text-amber-400 hover:text-neutral-400'
                            : 'text-neutral-400 hover:text-amber-400'
                        }`}>
                        {u.role === 'admin' ? '★ Admin' : '☆ Make Admin'}
                      </button>
                      <button
                        onClick={() => suspend(u._id, u.suspended)}
                        disabled={actionId === u._id}
                        className="text-xs font-medium text-neutral-400 hover:text-orange-400 transition-colors disabled:opacity-40">
                        {u.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => deleteUser(u._id)}
                        disabled={actionId === u._id}
                        className="text-xs font-medium text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-40">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-10 text-neutral-500 text-sm">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}
