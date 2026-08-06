import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { deposits, rounds, type Deposit, type DepositAsset } from '@/server/db/schema';
import { AppError } from '@/server/lib/http';
import { ticketsForStroops } from '@/lib/format';
import {
  buildDepositInvoke,
  buildDepositXdr,
  buildWithdrawInvoke,
  parsePoolInvoke,
  submitSignedSorobanXdr,
  submitSignedXdr,
  treasuryPay,
  verifyDepositPayment,
} from '@/server/stellar';
import { getRoundById } from './round.service';

export type { Deposit };
export type DepositWithRound = Deposit & { roundNumber: number; roundStatus: string };

export async function getDepositsByUser(publicKey: string): Promise<DepositWithRound[]> {
  const rows = await db
    .select({ deposit: deposits, roundNumber: rounds.roundNumber, roundStatus: rounds.status })
    .from(deposits)
    .innerJoin(rounds, eq(deposits.roundId, rounds.id))
    .where(eq(deposits.publicKey, publicKey))
    .orderBy(desc(deposits.createdAt));
  return rows.map((r) => ({ ...r.deposit, roundNumber: r.roundNumber, roundStatus: r.roundStatus }));
}

export async function getDepositsByRound(roundId: string): Promise<Deposit[]> {
  return db
    .select()
    .from(deposits)
    .where(eq(deposits.roundId, roundId))
    .orderBy(desc(deposits.createdAt));
}

// Build the UNSIGNED transaction the wallet must sign for a deposit.
// XLM -> a Soroban `deposit(saver, amount)` invocation on the pool contract.
// USDC -> a classic payment to the treasury (USDC is opt-in, not contract-backed).
export async function buildDeposit(input: {
  publicKey: string;
  asset: DepositAsset;
  amountStroops: string;
}): Promise<string> {
  if (input.asset === 'XLM') {
    return buildDepositInvoke(input.publicKey, input.amountStroops);
  }
  return buildDepositXdr({ from: input.publicKey, asset: 'USDC', amountStroops: input.amountStroops });
}

// Submit a signed deposit and record it ONLY after the chain confirms.
// The recorded amount is read from the signed transaction itself (XLM) or from
// the verified Horizon payment (USDC) — never trusted from the client.
export async function recordDeposit(input: {
  roundId: string;
  publicKey: string;
  asset: DepositAsset;
  signedXdr: string;
}): Promise<Deposit> {
  const round = await getRoundById(input.roundId);
  if (!round) throw new AppError('NOT_FOUND', 'Round not found', 404);
  if (round.status !== 'open') throw new AppError('CONFLICT', 'Round is closed for deposits', 409);

  let txHash: string;
  let amountStroops: string;

  if (input.asset === 'XLM') {
    // Verify the signed tx really calls our pool's deposit(saver, amount).
    const parsed = parsePoolInvoke(input.signedXdr, 'deposit', input.publicKey);
    amountStroops = parsed.amountStroops;
    txHash = await submitSignedSorobanXdr(input.signedXdr, 'Deposit');
  } else {
    txHash = await submitSignedXdr(input.signedXdr);
    const verified = await verifyDepositPayment({
      txHash,
      from: input.publicKey,
      asset: 'USDC',
    });
    amountStroops = verified.amountStroops;
  }

  const existing = await db
    .select()
    .from(deposits)
    .where(eq(deposits.txHash, txHash))
    .limit(1);
  if (existing.length) throw new AppError('ALREADY_EXISTS', 'This transaction is already recorded', 409);

  const tickets = ticketsForStroops(amountStroops);
  const [row] = await db
    .insert(deposits)
    .values({
      roundId: input.roundId,
      publicKey: input.publicKey,
      asset: input.asset,
      amountStroops,
      tickets,
      status: 'confirmed',
      txHash,
    })
    .returning();
  if (!row) throw new AppError('INTERNAL', 'Failed to record deposit');
  return row;
}

async function loadWithdrawable(depositId: string, publicKey: string): Promise<Deposit> {
  const [dep] = await db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
  if (!dep) throw new AppError('NOT_FOUND', 'Deposit not found', 404);
  if (dep.publicKey !== publicKey) throw new AppError('FORBIDDEN', 'Not your deposit', 403);
  if (dep.status !== 'confirmed') throw new AppError('CONFLICT', 'Deposit already withdrawn', 409);
  const round = await getRoundById(dep.roundId);
  if (round && round.status !== 'open') {
    throw new AppError('CONFLICT', 'Round is drawing — withdrawals reopen next round', 409);
  }
  return dep;
}

// For an XLM deposit, build the UNSIGNED `withdraw(saver, amount)` invocation the
// saver must sign to reclaim principal from the contract (the no-loss exit).
export async function buildWithdraw(input: {
  depositId: string;
  publicKey: string;
}): Promise<{ xdr: string }> {
  const dep = await loadWithdrawable(input.depositId, input.publicKey);
  if (dep.asset !== 'XLM') {
    throw new AppError('INVALID_INPUT', 'USDC withdrawals do not require a signature', 400);
  }
  const xdr = await buildWithdrawInvoke(input.publicKey, dep.amountStroops);
  return { xdr };
}

// Principal-safe withdrawal.
// XLM -> submit the saver-signed contract `withdraw` (funds leave the contract).
// USDC -> treasury refunds the principal payment on-chain (no signature needed).
export async function withdrawDeposit(input: {
  depositId: string;
  publicKey: string;
  signedXdr?: string;
}): Promise<Deposit> {
  const dep = await loadWithdrawable(input.depositId, input.publicKey);

  let txHash: string;
  if (dep.asset === 'XLM') {
    if (!input.signedXdr) {
      throw new AppError('INVALID_INPUT', 'A signed withdrawal transaction is required', 400);
    }
    const parsed = parsePoolInvoke(input.signedXdr, 'withdraw', input.publicKey);
    if (BigInt(parsed.amountStroops) !== BigInt(dep.amountStroops)) {
      throw new AppError('INVALID_INPUT', 'Withdrawal amount does not match the deposit', 400);
    }
    txHash = await submitSignedSorobanXdr(input.signedXdr, 'Withdrawal');
  } else {
    txHash = await treasuryPay({
      to: dep.publicKey,
      amountStroops: dep.amountStroops,
      asset: dep.asset,
    });
  }

  const [updated] = await db
    .update(deposits)
    .set({ status: 'withdrawn', withdrawTxHash: txHash, withdrawnAt: new Date() })
    .where(eq(deposits.id, dep.id))
    .returning();
  if (!updated) throw new AppError('INTERNAL', 'Failed to update deposit');
  return updated;
}

export async function getUserPosition(
  roundId: string,
  publicKey: string,
): Promise<{ tickets: number; principalStroops: string; usdcStroops: string; count: number }> {
  const rows = await db
    .select()
    .from(deposits)
    .where(
      and(
        eq(deposits.roundId, roundId),
        eq(deposits.publicKey, publicKey),
        eq(deposits.status, 'confirmed'),
      ),
    );
  let tickets = 0;
  let principal = 0n;
  let usdc = 0n;
  for (const r of rows) {
    tickets += r.tickets;
    if (r.asset === 'XLM') principal += BigInt(r.amountStroops);
    else usdc += BigInt(r.amountStroops);
  }
  return {
    tickets,
    principalStroops: principal.toString(),
    usdcStroops: usdc.toString(),
    count: rows.length,
  };
}
