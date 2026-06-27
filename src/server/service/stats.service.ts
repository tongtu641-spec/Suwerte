import { sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { deposits, rounds, sessions } from '@/server/db/schema';
import { env } from '@/server/config/env';

export interface Stats {
  uniqueWallets: number;
  logins: number;
  rounds: number;
  completedRounds: number;
  deposits: number;
  totalDepositedXlm: string;
  prizesPaidXlm: string;
  winners: number;
}

// Public interaction metrics. Any configured demo/seed keys are excluded so the
// figures reflect real on-chain activity by real wallets.
export async function getStats(): Promise<Stats> {
  const excluded = env.STATS_EXCLUDE_KEYS.split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const notExcluded = (col: typeof sessions.publicKey | typeof deposits.publicKey) =>
    excluded.length ? sql`${col} <> all(${excluded})` : sql`true`;

  const [sess] = await db
    .select({
      logins: sql<number>`count(*)`,
      wallets: sql<number>`count(distinct ${sessions.publicKey})`,
    })
    .from(sessions)
    .where(notExcluded(sessions.publicKey));

  const [dep] = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(case when ${deposits.asset} = 'XLM' then ${deposits.amountStroops}::numeric else 0 end), 0)::text`,
    })
    .from(deposits)
    .where(notExcluded(deposits.publicKey));

  const [rnd] = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where ${rounds.status} = 'completed')`,
      prizes: sql<string>`coalesce(sum(${rounds.prizeStroops}::numeric) filter (where ${rounds.status} = 'completed'), 0)::text`,
      winners: sql<number>`count(distinct ${rounds.winnerPublicKey}) filter (where ${rounds.winnerPublicKey} is not null)`,
    })
    .from(rounds);

  return {
    uniqueWallets: Number(sess?.wallets ?? 0),
    logins: Number(sess?.logins ?? 0),
    rounds: Number(rnd?.total ?? 0),
    completedRounds: Number(rnd?.completed ?? 0),
    deposits: Number(dep?.count ?? 0),
    totalDepositedXlm: String(dep?.total ?? '0').split('.')[0],
    prizesPaidXlm: String(rnd?.prizes ?? '0').split('.')[0],
    winners: Number(rnd?.winners ?? 0),
  };
}
