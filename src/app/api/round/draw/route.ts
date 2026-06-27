export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { executeDraw } from '@/server/service/round.service';

const schema = z.object({ roundId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    await requirePublicKey();
    const { roundId } = schema.parse(await req.json());
    const agg = await executeDraw(roundId);
    return ok({
      roundNumber: agg.round.roundNumber,
      winnerPublicKey: agg.round.winnerPublicKey,
      prizeStroops: agg.round.prizeStroops,
      drawTxHash: agg.round.drawTxHash,
      seedHash: agg.round.seedHash,
      serverSeed: agg.round.serverSeed,
    });
  } catch (err) {
    return fromError(err);
  }
}
