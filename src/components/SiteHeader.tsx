'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@/components/ConnectButton';
import { Wordmark } from '@/components/Logo';
import { NETWORK_LABEL } from '@/lib/stellar-config';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/play', label: 'Play' },
  { href: '/stats', label: 'Stats' },
];

const LANDING_ANCHORS = [
  { href: '#intro', label: 'Intro' },
  { href: '#ecosystem', label: 'Ecosystem' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#how-it-works', label: 'How it works' },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === '/landing') {
    return (
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/landing" className="shrink-0">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LANDING_ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink-text"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link href="/" className="btn btn-gold px-4 py-2 text-sm">
            Launch app
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'text-gold' : 'text-muted hover:text-ink-text'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="chip hidden md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            {NETWORK_LABEL}
          </span>
          <ConnectButton />
        </div>
      </div>

      {/* mobile nav */}
      <nav className="flex items-center justify-center gap-1 border-t border-line px-4 py-1.5 sm:hidden">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                active ? 'text-gold' : 'text-muted'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
