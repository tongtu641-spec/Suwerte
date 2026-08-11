'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Dice5,
  Loader2,
  ShieldCheck,
  Ticket,
  Trophy,
  Wallet,
} from 'lucide-react';
import { apiGet, apiPost, ApiException } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { formatAmount, shortKey, explorerTx, ticketsForStroops } from '@/lib/format';
import type { AccountBalances, CurrentRound, Deposit } from '@/lib/types';

export default function PlayPage() {
  const { publicKey, ready, connect, connecting } = useWallet();
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balances, setBalances] = useState<AccountBalances | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await apiGet<CurrentRound>('/api/round/current').catch(() => null);
    if (r) setRound(r);
    if (publicKey) {
      const [d, b] = await Promise.all([
        apiGet<Deposit[]>('/api/deposits').catch(() => []),
        apiGet<AccountBalances>('/api/account/balances').catch(() => null),
      ]);
      setDeposits(d);
      setBalances(b);
    } else {
      setDeposits([]);
      setBalances(null);
    }
  }, [publicKey]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading || !ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="skeleton h-8 w-64" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-64 lg:col-span-2" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {round && <RoundHeader round={round} />}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {!publicKey ? (
            <ConnectGate connect={connect} connecting={connecting} />
          ) : (
            round && (
              <DepositPanel
                round={round}
                balances={balances}
                onDone={refresh}
                onRefreshBalances={refresh}
              />
            )
          )}

          {publicKey && <MyDeposits deposits={deposits} onWithdraw={refresh} />}
        </div>

        <div className="space-y-5">
          {publicKey && round && <MyPosition round={round} />}
          {round && <DrawPanel round={round} connected={Boolean(publicKey)} onDrawn={refresh} />}
          {round && round.history.length > 0 && <WinnersMini round={round} />}
        </div>
      </div>
    </div>
  );
}

function RoundHeader({ round }: { round: CurrentRound }) {
  return (
    <div className="card relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="chip text-gold">
            <span className="h-2 w-2 rounded-full bg-gold pulse-ring" /> Round{' '}
            {round.round.roundNumber} · open
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl">
            Prize pot{' '}
            <span className="text-gold">{formatAmount(round.prizeStroops)} XLM</span>
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <HeaderStat label="Pooled" value={`${formatAmount(round.principalStroops)}`} suffix="XLM" />
          <HeaderStat label="Savers" value={String(round.playerCount)} />
          <HeaderStat label="Tickets" value={String(round.ticketCount)} />
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-2.5 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-ink-text">
        {value}
        {suffix && <span className="ml-1 text-xs text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

function ConnectGate({ connect, connecting }: { connect: () => Promise<void>; connecting: boolean }) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <span className="rounded-2xl border border-line bg-white/[0.03] p-4">
        <Wallet className="h-8 w-8 text-gold" />
      </span>
      <h2 className="mt-5 text-2xl">Connect to play</h2>
      <p className="mt-2 max-w-sm text-muted">
        Link your Freighter wallet to deposit XLM, collect tickets, and withdraw your principal. You
        sign a one-time challenge — no custody, no password.
      </p>
      <button
        onClick={async () => {
          try {
            await connect();
            toast.success('Wallet connected');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not connect');
          }
        }}
        disabled={connecting}
        className="btn btn-gold mt-6 text-base px-6 py-3"
      >
        <Wallet className="h-4 w-4" /> {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    </div>
  );
}

function DepositPanel({
  round,
  balances,
  onDone,
}: {
  round: CurrentRound;
  balances: AccountBalances | null;
  onDone: () => Promise<void>;
  onRefreshBalances: () => Promise<void>;
}) {
  const { signXdr } = useWallet();
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('XLM');
  const [amount, setAmount] = useState('5');
  const [busy, setBusy] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const numeric = Number(amount);
  const valid = /^\d+(\.\d{1,7})?$/.test(amount) && numeric > 0;
  const tickets = valid ? ticketsForStroops(BigInt(Math.floor(numeric * 1e7)).toString()) : 0;
  const needsTrust = asset === 'USDC' && balances && !balances.hasUsdcTrust;
  const bal = asset === 'XLM' ? balances?.xlm : balances?.usdc;
  const insufficient = valid && bal !== undefined && BigInt(Math.floor(numeric * 1e7)) > BigInt(bal ?? '0');

  async function enableUsdc() {
    setEnabling(true);
    try {
      const { xdr } = await apiPost<{ xdr: string }>('/api/usdc/build');
      const signed = await signXdr(xdr);
      await apiPost('/api/usdc/submit', { signedXdr: signed });
      toast.success('USDC enabled on your wallet');
      await onDone();
    } catch (e) {
      toast.error(errMsg(e, 'Could not enable USDC'));
    } finally {
      setEnabling(false);
    }
  }

  async function deposit() {
    if (!valid) return toast.error('Enter a valid amount');
    if (insufficient) return toast.error('Insufficient balance for this deposit');
    setBusy(true);
    try {
      const { xdr } = await apiPost<{ xdr: string }>('/api/deposits/build', { asset, amount });
      const signed = await signXdr(xdr);
      const dep = await apiPost<Deposit>('/api/deposits', {
        roundId: round.round.id,
        asset,
        signedXdr: signed,
      });
      toast.success(`Deposited ${formatAmount(dep.amountStroops)} ${asset} · ${dep.tickets} tickets`);
      await onDone();
    } catch (e) {
      toast.error(errMsg(e, 'Deposit failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Deposit into the pool</h2>
        <Ticket className="h-5 w-5 text-gold" />
      </div>
      <p className="mt-1 text-sm text-muted">Every whole {asset} earns one raffle ticket.</p>

      {/* asset selector */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {(['XLM', 'USDC'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAsset(a)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              asset === a ? 'border-gold bg-gold/10' : 'border-line bg-white/[0.02] hover:border-muted'
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold">{a}</span>
              {a === 'XLM' && <span className="chip text-mint">Default · no trustline</span>}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {balances ? `Balance ${formatAmount(a === 'XLM' ? balances.xlm : balances.usdc)}` : 'Native asset'}
            </span>
          </button>
        ))}
      </div>

      {needsTrust ? (
        <div className="mt-5 rounded-xl border border-line bg-white/[0.02] p-4">
          <p className="text-sm text-muted">
            Your wallet hasn&apos;t opted in to USDC yet. Enable it once with a single signed
            transaction (a trustline) — then you can deposit USDC.
          </p>
          <button onClick={enableUsdc} disabled={enabling} className="btn btn-ghost mt-3 w-full">
            {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {enabling ? 'Enabling…' : 'Enable USDC (one tap)'}
          </button>
        </div>
      ) : (
        <>
          <label className="mt-5 block text-sm text-muted">Amount</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              className="field"
              placeholder="0.00"
            />
            <span className="chip shrink-0">{asset}</span>
          </div>
          <div className="mt-2 flex gap-2">
            {['1', '5', '10', '25'].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="rounded-lg border border-line bg-white/[0.02] px-3 py-1 text-sm text-muted hover:border-gold hover:text-ink-text"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-muted">You&apos;ll receive</span>
            <span className="font-semibold text-gold">
              {tickets} ticket{tickets === 1 ? '' : 's'}
            </span>
          </div>

          {insufficient && (
            <p className="mt-2 text-sm text-coral">
              Not enough {asset}. Your balance is {formatAmount(bal ?? '0')} {asset}.
            </p>
          )}

          <button onClick={deposit} disabled={busy || !valid || Boolean(insufficient)} className="btn btn-gold mt-4 w-full text-base">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
            {busy ? 'Confirm in wallet…' : `Deposit ${valid ? amount : ''} ${asset}`}
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Signed by you, sent on-chain to the prize pool. Withdrawable any time the round is open.
          </p>
        </>
      )}
    </div>
  );
}

function MyPosition({ round }: { round: CurrentRound }) {
  const pos = round.position;
  const odds =
    pos && pos.tickets > 0 && round.ticketCount > 0
      ? ((pos.tickets / round.ticketCount) * 100).toFixed(1)
      : '0';
  return (
    <div className="card p-6">
      <h2 className="text-lg">Your position</h2>
      {!pos || pos.tickets === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No tickets yet this round. Make a deposit to enter the draw.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Your tickets</span>
            <span className="text-xl font-semibold text-gold">{pos.tickets}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Win chance</span>
            <span className="font-semibold text-ink-text">{odds}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Principal at stake</span>
            <span className="font-semibold text-mint">
              {formatAmount(pos.principalStroops)} XLM
            </span>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.02] p-3 text-xs text-muted">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-mint" />
            Win the prize or withdraw your principal — you cannot lose your deposit.
          </div>
        </div>
      )}
    </div>
  );
}

function MyDeposits({
  deposits,
  onWithdraw,
}: {
  deposits: Deposit[];
  onWithdraw: () => Promise<void>;
}) {
  const { signXdr } = useWallet();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function withdraw(d: Deposit) {
    setBusyId(d.id);
    try {
      if (d.asset === 'XLM') {
        // XLM principal is escrowed in the pool contract — the saver signs the
        // on-chain withdraw to pull it back out (the no-loss exit).
        const { xdr } = await apiPost<{ xdr: string }>('/api/deposits/withdraw/build', {
          depositId: d.id,
        });
        const signed = await signXdr(xdr);
        await apiPost('/api/deposits/withdraw', { depositId: d.id, signedXdr: signed });
      } else {
        await apiPost('/api/deposits/withdraw', { depositId: d.id });
      }
      toast.success('Principal returned on-chain');
      await onWithdraw();
    } catch (e) {
      toast.error(errMsg(e, 'Withdraw failed'));
    } finally {
      setBusyId(null);
    }
  }

  if (deposits.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg">Your deposits</h2>
        <p className="mt-3 text-sm text-muted">
          Nothing here yet. Your deposits and their on-chain receipts will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg">Your deposits</h2>
      <div className="mt-4 space-y-2">
        {deposits.map((d) => (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-3"
          >
            <div>
              <p className="font-semibold text-ink-text">
                {formatAmount(d.amountStroops)} {d.asset}
                <span className="ml-2 text-xs text-muted">
                  {d.tickets} tickets · Round {d.roundNumber}
                </span>
              </p>
              <a
                href={explorerTx(d.txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-mint hover:underline"
              >
                {shortKey(d.txHash)} <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
            {d.status === 'withdrawn' ? (
              <span className="chip text-muted">Withdrawn</span>
            ) : d.roundStatus === 'open' ? (
              <button
                onClick={() => withdraw(d)}
                disabled={busyId === d.id}
                className="btn btn-ghost text-sm"
              >
                {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busyId === d.id ? 'Withdrawing…' : 'Withdraw'}
              </button>
            ) : (
              <span className="chip text-muted">In draw</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DrawPanel({
  round,
  connected,
  onDrawn,
}: {
  round: CurrentRound;
  connected: boolean;
  onDrawn: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const canDraw = round.ticketCount > 0;

  async function draw() {
    setBusy(true);
    try {
      const res = await apiPost<{ winnerPublicKey: string; prizeStroops: string; drawTxHash: string }>(
        '/api/round/draw',
        { roundId: round.round.id },
      );
      toast.success(`Winner ${shortKey(res.winnerPublicKey)} won ${formatAmount(res.prizeStroops)} XLM`);
      await onDrawn();
    } catch (e) {
      toast.error(errMsg(e, 'Draw failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Run the draw</h2>
        <Dice5 className="h-5 w-5 text-gold" />
      </div>
      <p className="mt-2 text-sm text-muted">
        Any participant can trigger the draw once the round has deposits. The Soroban pool contract
        picks a winner weighted by principal and pays the prize on-chain — principal is never touched.
      </p>
      <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
        <p className="text-xs text-muted">Round commitment hash</p>
        <p className="mt-0.5 break-all font-mono text-xs text-ink-text">{round.round.seedHash}</p>
      </div>
      <button
        onClick={draw}
        disabled={!connected || !canDraw || busy}
        className="btn btn-ghost mt-4 w-full"
        title={!connected ? 'Connect to run the draw' : !canDraw ? 'No deposits yet' : ''}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
        {busy ? 'Drawing…' : 'Reveal & draw winner'}
      </button>
      {!canDraw && <p className="mt-2 text-center text-xs text-muted">Add a deposit to enable the draw.</p>}
    </div>
  );
}

function WinnersMini({ round }: { round: CurrentRound }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg">Past rounds</h2>
      <div className="mt-3 space-y-2">
        {round.history.slice(0, 4).map((h) => (
          <div
            key={h.roundNumber}
            className="flex items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className="text-muted">Round {h.roundNumber}</span>
            <span className="font-mono text-xs text-muted">{shortKey(h.winnerPublicKey)}</span>
            <span className="font-semibold text-gold">{formatAmount(h.prizeStroops ?? '0')} XLM</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof ApiException) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}
