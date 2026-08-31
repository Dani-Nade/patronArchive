import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

const NAV_LINKS = [
  { to: '/',       label: 'Home',    end: true },
  { to: '/builds', label: 'Builds'             },
  { to: '/heroes', label: 'Heroes'             },
  { to: '/forums', label: 'Forums'             },
];

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-8">

        {/* Logo */}
        <Link to="/" onClick={close} className="mr-6 flex items-center gap-2 shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-amber-400 shrink-0 -rotate-6">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          </svg>
          <span className="font-display text-lg text-neutral-100 leading-none pt-0.5">
            Patron's <span className="text-amber-400">Archive</span>
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex flex-1 items-center space-x-1 text-sm font-medium">
          {NAV_LINKS.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}`
              }>
              {n.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${isActive ? 'text-ember-400 bg-ember-500/10' : 'text-neutral-500 hover:text-ember-400 hover:bg-neutral-900'}`
              }>
              <span className="text-xs">⚙</span> Admin
            </NavLink>
          )}
        </nav>

        {/* ── Desktop auth ── */}
        <div className="hidden md:flex items-center space-x-4 shrink-0 ml-4">
          {user ? (
            <>
              <Link to="/profile" className="text-sm font-medium text-neutral-300 hover:text-amber-400 transition-colors">
                <span className="text-neutral-500">Hi,</span>{' '}
                <span className="text-teal-400 font-bold">{user.name}</span>
              </Link>
              <button onClick={logout} className="text-sm font-medium text-neutral-400 hover:text-red-400 transition-colors">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-neutral-100 transition-colors">
                Log in
              </Link>
              <Link to="/register" className="text-sm font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 px-4 py-2 rounded-lg transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          className="ml-auto flex md:hidden items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors">
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile menu dropdown ── */}
      {open && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950 px-4 pb-5 pt-3">
          <nav className="space-y-0.5 mb-4">
            {NAV_LINKS.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={close}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}`
                }>
                {n.label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink to="/admin" onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'text-ember-400 bg-ember-500/10' : 'text-neutral-500 hover:text-ember-400 hover:bg-neutral-900'}`
                }>
                <span className="text-xs">⚙</span> Admin Panel
              </NavLink>
            )}
          </nav>

          <div className="border-t border-neutral-800 pt-4 space-y-2">
            {user ? (
              <>
                <Link to="/profile" onClick={close}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-300 hover:text-amber-400 hover:bg-neutral-900 transition-colors">
                  <span className="text-neutral-500 mr-1">Hi,</span>
                  <span className="text-teal-400 font-bold">{user.name}</span>
                </Link>
                <button onClick={() => { logout(); close(); }}
                  className="w-full text-left flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={close}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors">
                  Log in
                </Link>
                <Link to="/register" onClick={close}
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
