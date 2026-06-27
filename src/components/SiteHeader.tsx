'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/Logo';
import { ConnectButton } from '@/components/ConnectButton';
import { NETWORK_LABEL } from '@/lib/stellar-config';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/play', label: 'Play' },
  { href: '/stats', label: 'Stats' },
];

export function SiteHeader() {
  const pathname = usePathname();
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
