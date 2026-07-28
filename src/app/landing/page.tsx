'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Coins,
  Dice5,
  Lock,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { APP_NETWORK, NETWORK_LABEL } from '@/lib/stellar-config';
import type { Stats } from '@/lib/types';

const CONTRACT_ID =
  APP_NETWORK === 'public'
    ? 'CCHM7Q7YSTQ4KCHKQS7HJKI5ZZWEPGQRLE4YSVCVZ3DYCTNHXPZ5KFFJ'
    : 'CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I';
const CONTRACT_EXPLORER_URL = `https://stellar.expert/explorer/${APP_NETWORK === 'public' ? 'public' : 'testnet'}/contract/${CONTRACT_ID}`;
const X_URL = 'https://x.com/SuwerteXLM';

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiGet<Stats>('/api/stats')
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div>
      <Hero />
      <StatsStrip stats={stats} />
      <HowItWorks />
      <OnChainProof />
      <FinalCta />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="chip text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Live on Stellar {NETWORK_LABEL}
          </span>
          <h1 className="mt-5 text-4xl leading-[1.05] sm:text-6xl">
            Your principal
            <br />
            <span className="text-mint">loops back.</span>
            <br />
            Only the <span className="text-gold">prize</span> moves.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Suwerte is a no-loss prize pool on Stellar. Deposit XLM, hold raffle tickets, and one
            wallet wins the sponsored prize each round. Your deposit is never at risk — it&apos;s
            withdrawable on-chain any time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/play" className="btn btn-gold text-base px-6 py-3">
              Deposit &amp; enter <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={CONTRACT_EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost text-base px-6 py-3"
            >
              View contract on-chain <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-mint" /> Principal never at risk
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-mint" /> Verifiable on-chain
            </span>
          </div>
        </div>

        <LoopMotif />
      </div>
    </section>
  );
}

function LoopMotif() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="card relative flex aspect-square max-w-sm items-center justify-center overflow-hidden justify-self-center p-8 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />

      <svg viewBox="0 0 240 240" className="relative h-full w-full" aria-hidden="true">
        <circle cx="120" cy="120" r="92" fill="none" stroke="var(--color-line)" strokeWidth="2" />

        {!reduceMotion && (
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 9 }}
            style={{ originX: '120px', originY: '120px' }}
          >
            <circle cx="120" cy="28" r="6" fill="var(--color-mint)" />
          </motion.g>
        )}
        {reduceMotion && <circle cx="120" cy="28" r="6" fill="var(--color-mint)" />}

        {!reduceMotion && (
          <motion.circle
            r="5"
            fill="var(--color-gold)"
            animate={{
              cx: [120, 120, 120],
              cy: [28, 120, 28],
              opacity: [0, 1, 0],
              scale: [0.6, 1.2, 0.6],
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', repeatDelay: 1.4 }}
          />
        )}

        <foreignObject x="90" y="90" width="60" height="60">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-panel-2/80 ring-1 ring-line">
            <ShieldCheck className="h-7 w-7 text-mint" />
          </div>
        </foreignObject>
      </svg>

      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Principal, always circling home
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Prize, drawn each round
        </span>
      </div>
    </div>
  );
}

function StatsStrip({ stats }: { stats: Stats | null }) {
  const tiles = [
    { icon: Users, label: 'Unique wallets', value: stats ? String(stats.uniqueWallets) : null },
    {
      icon: Coins,
      label: 'XLM pooled all-time',
      value: stats ? formatAmount(stats.totalDepositedXlm) : null,
    },
    {
      icon: Trophy,
      label: 'XLM paid in prizes',
      value: stats ? formatAmount(stats.prizesPaidXlm) : null,
    },
    { icon: Sparkles, label: 'Distinct winners', value: stats ? String(stats.winners) : null },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <t.icon className="h-5 w-5 text-gold" />
            {t.value === null ? (
              <div className="skeleton mt-4 h-8 w-16" />
            ) : (
              <p className="mt-4 text-3xl font-semibold text-ink-text">{t.value}</p>
            )}
            <p className="mt-1 text-sm text-muted">{t.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Real numbers from real wallets — no seed data.{' '}
        <Link href="/stats" className="text-mint hover:underline">
          Full stats
        </Link>
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Wallet, title: 'Connect', body: 'Link Freighter with a signed challenge. No custody.' },
    {
      icon: Ticket,
      title: 'Deposit XLM',
      body: 'Every whole unit deposited earns a raffle ticket.',
    },
    {
      icon: Dice5,
      title: 'Open draw',
      body: 'A committed seed is revealed; the winner is computed in the open.',
    },
    {
      icon: Trophy,
      title: 'Win or withdraw',
      body: 'Winner is paid on-chain. Everyone else keeps their full principal.',
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl sm:text-3xl">The loop, in four steps</h2>
      <p className="mt-2 text-muted">No lock-ups. No losses. Only the prize slice moves.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
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
  );
}

function OnChainProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="card grid gap-6 p-7 sm:p-10 md:grid-cols-2">
        <div>
          <span className="chip text-mint">
            <ShieldCheck className="h-3.5 w-3.5" /> Deployed on Stellar {NETWORK_LABEL}
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl">Not a promise. A contract.</h2>
          <p className="mt-3 text-muted">
            The no-loss guarantee is enforced in Rust on-chain, not by a backend team. Every
            deposit, draw, and withdrawal is a Soroban transaction anyone can verify.
          </p>
          <a
            href={CONTRACT_EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-mint hover:underline"
          >
            View the suwerte-pool contract <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="self-center rounded-xl border border-line bg-white/[0.02] p-5">
          <p className="text-xs text-muted">Contract ID</p>
          <p className="mt-1.5 break-all font-mono text-sm text-ink-text">{CONTRACT_ID}</p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <div className="card relative overflow-hidden p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />
        </div>
        <h2 className="relative text-3xl sm:text-4xl">Keep your stake. Chase the prize.</h2>
        <p className="relative mx-auto mt-3 max-w-md text-muted">
          Join the open round on Stellar {NETWORK_LABEL}. Withdraw your principal whenever you want
          — the only thing on the table is the prize.
        </p>
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/play" className="btn btn-gold text-base px-7 py-3">
            Deposit &amp; enter <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost text-base px-7 py-3"
          >
            Follow @SuwerteXLM <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
