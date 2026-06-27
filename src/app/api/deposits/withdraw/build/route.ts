export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { buildWithdraw } from '@/server/service/deposit.service';

const schema = z.object({ depositId: z.string().uuid() });

// Build the UNSIGNED contract `withdraw` for an XLM deposit. The saver signs it
// to pull their principal back out of the pool — the no-loss exit, on-chain.
export async function POST(req: NextRequest) {
  try {
    const publicKey = await requirePublicKey();
    const { depositId } = schema.parse(await req.json());
    const { xdr } = await buildWithdraw({ depositId, publicKey });
    return ok({ xdr });
  } catch (err) {
    return fromError(err);
  }
}
