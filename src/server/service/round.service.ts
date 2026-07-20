import { and, desc, eq, sql } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { deposits, rounds, type Round } from '@/server/db/schema';
import { AppError } from '@/server/lib/http';
import { generateSeed, seedHash } from '@/server/lib/fairness';
import { adminDraw, adminFundPrize, getPoolStats } from '@/server/stellar';
import { STROOPS_PER_UNIT } from '@/lib/format';

export type { Round };

export interface RoundAggregate {
  round: Round;
  principalStroops: string; // XLM principal locked this round (default asset)
  usdcPrincipalStroops: string;
  playerCount: number;
  ticketCount: number;
  prizeStroops: string; // live sponsored prize (XLM)
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function ensureCurrentRound(): Promise<Round> {
  const [open] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.status, 'open'))
    .orderBy(desc(rounds.roundNumber))
    .limit(1);
  if (open) return open;

  const [{ max } = { max: 0 }] = await db
    .select({ max: sql<number>`coalesce(max(${rounds.roundNumber}), 0)` })
    .from(rounds);

  const seed = generateSeed();
  const [created] = await db
    .insert(rounds)
    .values({
      roundNumber: Number(max) + 1,
      status: 'open',
      seedHash: seedHash(seed),
      serverSeed: seed, // revealed only at draw; never sent to the client before then
      closesAt: new Date(Date.now() + ONE_WEEK_MS),
    })
    .returning();
  if (!created) throw new AppError('INTERNAL', 'Failed to open round');
  return created;
}

export async function getRoundById(id: string): Promise<Round | null> {
  const [r] = await db.select().from(rounds).where(eq(rounds.id, id)).limit(1);
  return r ?? null;
}

export async function getCompletedRounds(limit = 10): Promise<Round[]> {
  return db
    .select()
    .from(rounds)
    .where(eq(rounds.status, 'completed'))
    .orderBy(desc(rounds.roundNumber))
    .limit(limit);
}

function computePrize(principalStroops: string): string {
  const base = BigInt(env.PRIZE_BASE_UNITS) * STROOPS_PER_UNIT;
  const rate = (BigInt(principalStroops) * BigInt(env.PRIZE_RATE_BPS)) / 10_000n;
  return (base + rate).toString();
}

export async function aggregateRound(round: Round): Promise<RoundAggregate> {
  const rows = await db
    .select({
      asset: deposits.asset,
      principal: sql<string>`coalesce(sum(${deposits.amountStroops}::numeric), 0)::text`,
      tickets: sql<number>`coalesce(sum(${deposits.tickets}), 0)`,
      players: sql<number>`count(distinct ${deposits.publicKey})`,
    })
    .from(deposits)
    .where(and(eq(deposits.roundId, round.id), eq(deposits.status, 'confirmed')))
    .groupBy(deposits.asset);

  let principalStroops = '0';
  let usdcPrincipalStroops = '0';
  let ticketCount = 0;

  for (const r of rows) {
    if (r.asset === 'XLM') principalStroops = String(r.principal).split('.')[0];
    else usdcPrincipalStroops = String(r.principal).split('.')[0];
    ticketCount += Number(r.tickets);
  }

  const [{ p = 0 } = { p: 0 }] = await db
    .select({ p: sql<number>`count(distinct ${deposits.publicKey})` })
    .from(deposits)
    .where(and(eq(deposits.roundId, round.id), eq(deposits.status, 'confirmed')));

  const prizeStroops = round.prizeStroops ?? computePrize(principalStroops);

  return {
    round,
    principalStroops,
    usdcPrincipalStroops,
    playerCount: Number(p),
    ticketCount,
    prizeStroops,
  };
}

export async function executeDraw(roundId: string): Promise<RoundAggregate> {
  const round = await getRoundById(roundId);
  if (!round) throw new AppError('NOT_FOUND', 'Round not found', 404);
  if (round.status !== 'open') throw new AppError('CONFLICT', 'Round is not open for a draw', 409);

  const holders = await db
    .select({
      publicKey: deposits.publicKey,
      tickets: sql<number>`sum(${deposits.tickets})`,
    })
    .from(deposits)
    .where(and(eq(deposits.roundId, roundId), eq(deposits.status, 'confirmed')))
    .groupBy(deposits.publicKey);

  if (holders.length === 0) {
    throw new AppError('INVALID_INPUT', 'No deposits yet — nobody to draw', 400);
  }

  // The contract is the source of truth for who can win: it picks a winner
  // weighted by on-chain principal. Make sure there is principal escrowed.
  const stats = await getPoolStats();
  if (BigInt(stats.totalPrincipalStroops) <= 0n) {
    throw new AppError('INVALID_INPUT', 'No on-chain savings in the pool yet', 400);
  }

  await db
    .update(rounds)
    .set({ status: 'drawing', updatedAt: new Date() })
    .where(eq(rounds.id, roundId));

  const seed = round.serverSeed ?? generateSeed();
  const agg = await aggregateRound(round);
  const prizeStroops = computePrize(agg.principalStroops);

  // Settle entirely on-chain: the treasury funds the prize into the contract,
  // then the contract draws a principal-weighted winner and pays them. Principal
  // is never touched — the no-loss guarantee is enforced in the contract.
  let winner: string;
  let drawTxHash: string;
  try {
    await adminFundPrize(prizeStroops);
    const result = await adminDraw();
    winner = result.winner;
    drawTxHash = result.txHash;
  } catch (err) {
    await db
      .update(rounds)
      .set({ status: 'open', updatedAt: new Date() })
      .where(eq(rounds.id, roundId));
    throw new AppError('INTERNAL', `On-chain draw failed: ${(err as Error).message}`, 502);
  }

  const [updated] = await db
    .update(rounds)
    .set({
      status: 'completed',
      winnerPublicKey: winner,
      prizeStroops,
      serverSeed: seed,
      drawTxHash,
      drawAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(rounds.id, roundId))
    .returning();

  // Open the next round so the product is never stuck.
  await ensureCurrentRound();

  return aggregateRound(updated!);
}
