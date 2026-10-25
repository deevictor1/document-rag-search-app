'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Search' },
    { href: '/documents', label: 'Documents' },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="RAG Search home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 3.5h8l4 4v9H4v-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 3.5v4h4M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </span>
          <span className="text-sm font-semibold tracking-wide text-white">RAG <span className="text-slate-400">SEARCH</span></span>
        </Link>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
