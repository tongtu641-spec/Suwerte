'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  Coins,
  Compass,
  Dice5,
  Gift,
  Globe,
  KeyRound,
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
      <Ecosystem />
      <TechnicalWalkthrough />
      <Roadmap />
      <OnChainProof />
      <FinalCta />
    </div>
  );
}

function Hero() {
  return (
    <section
      id="intro"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-14 pb-10 sm:px-6 sm:pt-20"
    >
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
      body: "The contract's on-chain PRNG picks the winner live — anyone can watch it happen and check the math after.",
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
      <p className="mt-2 text-muted">
        Nothing gets locked up, nothing gets lost — the only thing that moves is the prize.
      </p>
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

function FlowNode({
  icon: Icon,
  accent,
  title,
  caption,
  highlight,
}: {
  icon: typeof Wallet;
  accent: 'mint' | 'gold';
  title: string;
  caption: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`flex items-center justify-center rounded-full bg-panel-2 ring-2 ${
          accent === 'gold' ? 'ring-gold' : 'ring-mint'
        } ${highlight ? 'h-20 w-20' : 'h-16 w-16'}`}
      >
        <Icon
          className={`${highlight ? 'h-8 w-8' : 'h-6 w-6'} ${accent === 'gold' ? 'text-gold' : 'text-mint'}`}
        />
      </div>
      <p className="mt-3 text-sm font-medium text-ink-text">{title}</p>
      <p className="mt-1 max-w-[10rem] text-xs text-muted">{caption}</p>
    </div>
  );
}

function FlowConnector({
  accent,
  label,
  reduceMotion,
}: {
  accent: 'mint' | 'gold';
  label: string;
  reduceMotion: boolean | null;
}) {
  const color = accent === 'gold' ? 'text-gold' : 'text-mint';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 sm:py-0">
      <motion.div
        className={color}
        animate={
          reduceMotion
            ? undefined
            : accent === 'mint'
              ? { opacity: [0.4, 1, 0.4] }
              : { opacity: [0.3, 1, 0.3] }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                repeat: Infinity,
                duration: accent === 'mint' ? 2.6 : 1.6,
                ease: 'easeInOut',
                repeatDelay: accent === 'mint' ? 0 : 1.4,
              }
        }
      >
        <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
      </motion.div>
      <p className="max-w-[9rem] text-center text-[11px] text-muted">{label}</p>
    </div>
  );
}

function FlowMotif() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between">
      <FlowNode
        icon={Wallet}
        accent="mint"
        title="Depositors"
        caption="principal, withdrawable any time"
      />
      <FlowConnector accent="mint" label="deposit & withdraw" reduceMotion={reduceMotion} />
      <FlowNode
        icon={ShieldCheck}
        accent="gold"
        title="suwerte-pool contract"
        caption="principal and prize tracked separately"
        highlight
      />
      <FlowConnector
        accent="gold"
        label="prize slice, one winner per draw"
        reduceMotion={reduceMotion}
      />
      <FlowNode
        icon={Trophy}
        accent="gold"
        title="One winner"
        caption="only the prize slice moves"
      />
    </div>
  );
}

function Ecosystem() {
  const actors = [
    {
      icon: Wallet,
      title: 'Depositors',
      body: 'Savers who deposit XLM, hold principal weighted by ticket count, and can withdraw in full at any time.',
    },
    {
      icon: Gift,
      title: 'Prize sponsor',
      body: "Whoever calls fund_prize tops up the pot the next draw pays out. Sponsor funds never touch a saver's principal.",
    },
    {
      icon: ShieldCheck,
      title: 'suwerte-pool contract',
      body: 'The Soroban contract itself — the only custodian. It escrows every principal, holds the prize pool, and runs the draw.',
      highlight: true,
    },
    {
      icon: Globe,
      title: 'Stellar network',
      body: `The settlement layer. Every deposit, withdrawal, prize top-up, and draw finalizes as a Stellar ${NETWORK_LABEL} transaction.`,
    },
    {
      icon: KeyRound,
      title: 'Freighter & Stellar wallets',
      body: 'Sign every saver-side call. The app never holds a private key and never custodies a signature.',
    },
    {
      icon: Coins,
      title: 'Native XLM',
      body: 'The settlement asset, moved through its Stellar Asset Contract — no trustline required.',
    },
  ];

  return (
    <section id="ecosystem" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
      <span className="chip text-mint">
        <Globe className="h-3.5 w-3.5" /> Ecosystem
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl">Who actually moves the pool</h2>
      <p className="mt-2 max-w-2xl text-muted">
        Suwerte runs on one contract — no token stack bolted on beside it. These are the parties
        that actually touch a round; nobody here is invented for the pitch.
      </p>
      <div className="card mt-8 p-6 sm:p-10">
        <FlowMotif />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actors.map((a) => (
          <div key={a.title} className={`card p-5 ${a.highlight ? 'border-gold/40' : ''}`}>
            <a.icon className={`h-6 w-6 ${a.highlight ? 'text-gold' : 'text-mint'}`} />
            <h3 className="mt-4 text-lg">{a.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{a.body}</p>
            {a.highlight && (
              <a
                href={CONTRACT_EXPLORER_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-mint hover:underline"
              >
                View on-chain <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TechnicalWalkthrough() {
  const entryPoints = [
    {
      fn: 'initialize(admin, token)',
      body: 'One-time setup. Records the admin and the escrow token — the XLM Stellar Asset Contract.',
    },
    {
      fn: 'deposit(saver, amount)',
      body: "Saver-authorized. Pulls amount into the contract and credits the saver's principal.",
    },
    {
      fn: 'withdraw(saver, amount)',
      body: 'Saver-authorized. Returns up to the full principal to the saver — any time, never gated by a draw.',
    },
    {
      fn: 'fund_prize(funder, amount)',
      body: 'Funder-authorized. Adds to a prize balance kept separate from every principal.',
    },
    {
      fn: 'draw()',
      body: 'Admin-authorized. Picks one winner weighted by principal and pays the whole prize pool to them.',
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
      <span className="chip text-gold">
        <Code2 className="h-3.5 w-3.5" /> How it works
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl">The mechanics, precisely</h2>
      <p className="mt-2 max-w-2xl text-muted">
        suwerte-pool is a Rust contract on soroban-sdk with five entry points. No backend custody —
        this is the condensed technical read; the full source is linked below.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-lg">Entry points</h3>
          <ul className="mt-4 space-y-4">
            {entryPoints.map((e) => (
              <li key={e.fn}>
                <code className="font-mono text-sm text-gold">{e.fn}</code>
                <p className="mt-1 text-sm text-muted">{e.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg">Custody</h3>
            <p className="mt-2 text-sm text-muted">
              A deposit sits in the contract&apos;s own balance from the moment it lands. withdraw
              always returns exactly the principal a saver put in, on demand. fund_prize adds to a
              separate prize balance that draw never mixes with principal — the two balances are
              tracked independently in contract storage.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg">How the draw is fair</h3>
            <p className="mt-2 text-sm text-muted">
              draw() pulls a uniformly random value in [0, total principal) from Soroban&apos;s
              on-chain PRNG, then walks the list of savers accumulating each one&apos;s principal
              until the random value falls inside a saver&apos;s range — one ticket per unit of
              principal deposited. The whole computation runs inside the transaction, so anyone can
              re-derive the winner from the chain.
            </p>
          </div>
        </div>
      </div>
      <a
        href={CONTRACT_EXPLORER_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-mint hover:underline"
      >
        View the suwerte-pool contract source &amp; history <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}

function Roadmap() {
  const liveNow = [
    'Deposit, withdraw, and a principal-weighted draw running on a live Soroban contract, on mainnet and testnet',
    "No-loss withdrawal enforced in the contract itself — a draw can never touch a saver's principal",
    'Freighter wallet connect through a real SEP-10 challenge, no password, no custody',
    'Native XLM settlement with no trustline required',
    'An opt-in USDC path alongside XLM',
    'Public stats sourced only from real wallets — no seed data',
  ];
  const whatsNext = [
    'More prize sponsors, not just a single treasury key',
    'Wallet support beyond Freighter',
    'An independent audit of the pool contract',
    'Multisig or key rotation for the admin role',
    'Automated round closing instead of an admin-triggered draw',
    'On-chain event indexing for deeper history',
  ];

  return (
    <section id="roadmap" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
      <span className="chip text-mint">
        <Compass className="h-3.5 w-3.5" /> Roadmap
      </span>
      <h2 className="mt-4 text-2xl sm:text-3xl">What&apos;s shipped, what&apos;s still ahead</h2>
      <p className="mt-2 max-w-2xl text-muted">
        Live now is already running on-chain. What&apos;s next is the honest direction we&apos;re
        pointed — we&apos;re skipping dates, since a hackathon timeline is mostly a guess anyway.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-mint" /> Live now
          </h3>
          <ul className="mt-4 space-y-3">
            {liveNow.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-gold" /> What&apos;s next
          </h3>
          <ul className="mt-4 space-y-3">
            {whatsNext.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Could move. Could slip. That&apos;s a roadmap.</p>
        </div>
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
            The no-loss guarantee lives in Rust, on-chain — no backend team standing behind the
            curtain. Every deposit, draw, and withdrawal is a Soroban transaction anyone can verify.
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
