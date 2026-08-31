import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

const NAV = [
  { to: '/admin',          label: 'Dashboard',    icon: '▤', end: true },
  { to: '/admin/users',    label: 'Users',         icon: '👤' },
  { to: '/admin/reports',  label: 'Reports',       icon: '⚑' },
  { to: '/admin/items',    label: 'Hero & Items',  icon: '⚔' },
  { to: '/admin/health',   label: 'System Health', icon: '◎' },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'admin') return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="text-2xl font-black text-red-400 mb-2">Access Denied</p>
        <p className="text-sm">Admin access required.</p>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 px-3 mb-4">Admin Panel</p>
      <nav className="space-y-0.5">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
              }`
            }>
            <span className="text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-neutral-50 font-sans flex">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={close}
        />
      )}

      {/* ── Sidebar ── */}
      {/* Mobile: fixed overlay sliding from left. Desktop: static in flex flow. */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-50 w-56 bg-[#0a0a0a] border-r border-neutral-800
          flex flex-col py-6 px-3 transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:shrink-0 md:flex
        `}
      >
        <SidebarContent />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto px-4 sm:px-8 py-6 min-w-0">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex md:hidden items-center gap-2 text-sm font-bold text-neutral-400 hover:text-teal-400 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl mb-6 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 2h12M1 7h12M1 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Menu
        </button>

        <Outlet />
      </main>
    </div>
  );
}
