import Link from 'next/link';
import { Wordmark } from '@/components/Logo';
import { NETWORK_LABEL } from '@/lib/stellar-config';

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Wordmark />
          <p className="max-w-sm text-sm text-muted">
            No-loss prize savings on Stellar. Pool together, keep your principal, and someone wins
            the weekly prize — every draw verifiable on-chain.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/play" className="text-muted hover:text-ink-text">
            Play this round
          </Link>
          <Link href="/stats" className="text-muted hover:text-ink-text">
            Live stats
          </Link>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-ink-text"
          >
            Stellar Explorer
          </a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:px-6">
          <span>Suwerte runs on Stellar {NETWORK_LABEL}. Built for the Stellar APAC Hackathon.</span>
          <span>Principal-safe · Provably fair · Open draws</span>
        </div>
      </div>
    </footer>
  );
}
