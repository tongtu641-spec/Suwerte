export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { env } from '@/server/config/env';
import { getSessionPublicKey } from '@/server/lib/session';
import {
  aggregateRound,
  ensureCurrentRound,
  getCompletedRounds,
} from '@/server/service/round.service';
import { getUserPosition } from '@/server/service/deposit.service';

export async function GET() {
  try {
    const round = await ensureCurrentRound();
    const agg = await aggregateRound(round);
    const history = await getCompletedRounds(6);
    const publicKey = await getSessionPublicKey();
    const position = publicKey ? await getUserPosition(round.id, publicKey) : null;

    return ok({
      round: {
        id: agg.round.id,
        roundNumber: agg.round.roundNumber,
        status: agg.round.status,
        seedHash: agg.round.seedHash,
        closesAt: agg.round.closesAt,
      },
      principalStroops: agg.principalStroops,
      usdcPrincipalStroops: agg.usdcPrincipalStroops,
      playerCount: agg.playerCount,
      ticketCount: agg.ticketCount,
      prizeStroops: agg.prizeStroops,
      position,
      treasury: env.TREASURY_PUBLIC_KEY,
      usdc: { code: env.USDC_ASSET_CODE },
      history: history.map((r) => ({
        roundNumber: r.roundNumber,
        winnerPublicKey: r.winnerPublicKey,
        prizeStroops: r.prizeStroops,
        drawTxHash: r.drawTxHash,
        seedHash: r.seedHash,
        serverSeed: r.serverSeed,
        drawAt: r.drawAt,
      })),
    });
  } catch (err) {
    return fromError(err);
  }
}
