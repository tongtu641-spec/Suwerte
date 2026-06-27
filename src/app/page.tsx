'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  Trophy,
  Dice5,
  Lock,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatAmount, shortKey, explorerTx } from '@/lib/format';
import type { CurrentRound } from '@/lib/types';

export default function HomePage() {
  const [data, setData] = useState<CurrentRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CurrentRound>('/api/round/current')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="chip text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Provably-fair · Principal-safe
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] sm:text-6xl">
              Save together.
              <br />
              <span className="text-gold">Nobody loses.</span>
              <br />
              Someone wins.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Suwerte is a no-loss prize pool on Stellar. Deposit XLM into the weekly round, collect
              raffle tickets, and one lucky wallet takes the sponsored prize. Everyone else keeps
              every stroop of their principal — withdrawable any time.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/play" className="btn btn-gold text-base px-6 py-3">
                Enter this round <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/stats" className="btn btn-ghost text-base px-6 py-3">
                See live stats
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-mint" /> Your deposit is always yours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-mint" /> On-chain &amp; verifiable
              </span>
            </div>
          </div>

          {/* Live round card */}
          <LiveRoundCard data={data} loading={loading} />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl sm:text-3xl">How a round works</h2>
        <p className="mt-2 text-muted">Four steps. No lock-ups, no losses.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Wallet,
              title: 'Connect',
              body: 'Link your Freighter wallet with a signed challenge. No password, no custody.',
            },
            {
              icon: Ticket,
              title: 'Deposit XLM',
              body: 'Send XLM to the prize pool. Every whole unit earns you a raffle ticket.',
            },
            {
              icon: Dice5,
              title: 'Open draw',
              body: 'A committed random seed is revealed and the winner is computed in the open.',
            },
            {
              icon: Trophy,
              title: 'Win or withdraw',
              body: 'The winner is paid on-chain. Everyone else withdraws their full principal.',
            },
          ].map((s, i) => (
            <div key={s.title} className="card p-5">
              <div className="flex items-center justify-between">
                <s.icon className="h-6 w-6 text-gold" />
                <span className="font-display text-2xl text-line">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* No-loss promise */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="card grid gap-6 p-7 sm:p-10 md:grid-cols-2">
          <div>
            <span className="chip text-mint">
              <ShieldCheck className="h-3.5 w-3.5" /> The no-loss promise
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl">Lose nothing. That&apos;s the whole point.</h2>
            <p className="mt-3 text-muted">
              Prize-linked savings flip the lottery on its head: instead of buying a ticket you can
              never get back, your stake stays yours. The prize is funded by the protocol treasury,
              not by other savers. Win and you take the prize. Don&apos;t win and you simply withdraw
              what you put in.
            </p>
          </div>
          <div className="grid gap-3 self-center">
            {[
              ['Principal-safe', 'Withdraw your deposit on-chain whenever the round is open.'],
              ['Provably fair', 'The draw seed is committed up-front and revealed at draw time.'],
              ['XLM by default', 'Native XLM needs no trustline. USDC is one tap away.'],
            ].map(([t, b]) => (
              <div key={t} className="flex gap-3 rounded-xl border border-line bg-white/[0.02] p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                <div>
                  <p className="font-semibold text-ink-text">{t}</p>
                  <p className="text-sm text-muted">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past winners */}
      {data && data.history.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl sm:text-3xl">Recent winners</h2>
          <p className="mt-2 text-muted">Every prize paid on-chain — click to verify.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.history.slice(0, 6).map((h) => (
              <div key={h.roundNumber} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="chip">Round {h.roundNumber}</span>
                  <Trophy className="h-5 w-5 text-gold" />
                </div>
                <p className="mt-4 text-2xl font-semibold text-gold">
                  {formatAmount(h.prizeStroops ?? '0')} XLM
                </p>
                <p className="mt-1 font-mono text-sm text-muted">{shortKey(h.winnerPublicKey)}</p>
                {h.drawTxHash && (
                  <a
                    href={explorerTx(h.drawTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-mint hover:underline"
                  >
                    View payout <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />
          </div>
          <h2 className="relative text-3xl sm:text-4xl">Feeling lucky this week?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-muted">
            Join the open round. Your principal stays safe — the only thing you can win is the prize.
          </p>
          <Link href="/play" className="btn btn-gold relative mx-auto mt-6 text-base px-7 py-3">
            Enter this round <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function LiveRoundCard({ data, loading }: { data: CurrentRound | null; loading: boolean }) {
  return (
    <div className="card relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <span className="chip text-gold">
          <span className="h-2 w-2 rounded-full bg-gold pulse-ring" />
          {data ? `Round ${data.round.roundNumber} · open` : 'Live round'}
        </span>
        <span className="text-xs text-muted">Stellar Testnet</span>
      </div>

      <p className="relative mt-6 text-sm text-muted">This week&apos;s prize</p>
      {loading ? (
        <div className="skeleton mt-2 h-12 w-48" />
      ) : (
        <p className="relative mt-1 text-5xl font-semibold text-gold">
          {formatAmount(data?.prizeStroops ?? '0')}
          <span className="ml-2 text-2xl text-gold-soft">XLM</span>
        </p>
      )}

      <div className="relative mt-7 grid grid-cols-3 gap-3">
        <Stat
          label="Pooled"
          value={loading ? null : `${formatAmount(data?.principalStroops ?? '0')}`}
          suffix="XLM"
        />
        <Stat label="Savers" value={loading ? null : String(data?.playerCount ?? 0)} />
        <Stat label="Tickets" value={loading ? null : String(data?.ticketCount ?? 0)} />
      </div>

      <Link href="/play" className="btn btn-gold relative mt-7 w-full">
        Deposit &amp; get tickets <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="relative mt-3 text-center text-xs text-muted">
        Principal-safe · withdraw anytime the round is open
      </p>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string | null; suffix?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      {value === null ? (
        <div className="skeleton mx-auto mt-1.5 h-5 w-10" />
      ) : (
        <p className="mt-0.5 text-lg font-semibold text-ink-text">
          {value}
          {suffix && <span className="ml-1 text-xs text-muted">{suffix}</span>}
        </p>
      )}
    </div>
  );
}
