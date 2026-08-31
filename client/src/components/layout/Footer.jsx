import { Link } from 'react-router-dom';
import TornEdge from './TornEdge.jsx';

function Col({ title, links }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-sm text-neutral-400 hover:text-amber-400 transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-20">
      <TornEdge fill="#1d1a16" />
      <div className="relative bg-neutral-900 px-4 sm:px-8 pt-12 pb-8 overflow-hidden">
        <div className="halftone absolute -top-4 right-[6%] w-64 h-40 opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]" aria-hidden="true" />
        <span className="font-display text-[7rem] leading-none text-stroke-cream absolute -bottom-16 -left-4 select-none pointer-events-none whitespace-nowrap" aria-hidden="true">
          THE ARCHIVE
        </span>

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-16">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-amber-400 -rotate-6">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                </svg>
                <span className="font-display text-xl text-neutral-100">
                  Patron's <span className="text-amber-400">Archive</span>
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
                A community-built library of Deadlock builds, item math, written
                guides and arguments about all three.
              </p>
            </div>

            <div className="flex gap-14 sm:gap-20 flex-wrap">
              <Col title="Explore" links={[
                ['Community Builds', '/builds'],
                ['Hero Directory', '/heroes'],
                ['Forums', '/forums'],
              ]} />
              <Col title="Create" links={[
                ['Build Calculator', '/builds/create'],
                ['Start a Thread', '/forums/create'],
                ['Join the Archive', '/register'],
              ]} />
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-10 pt-5 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-neutral-600">
            <span>A fan project — not affiliated with Valve. Deadlock and all game art belong to Valve Corporation.</span>
            <span>Live game data via deadlock-api.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
