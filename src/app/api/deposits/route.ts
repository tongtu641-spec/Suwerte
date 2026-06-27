export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, created, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { getDepositsByUser, recordDeposit } from '@/server/service/deposit.service';

const schema = z.object({
  roundId: z.string().uuid(),
  asset: z.enum(['XLM', 'USDC']),
  signedXdr: z.string().min(1),
});

export async function GET() {
  try {
    const publicKey = await requirePublicKey();
    return ok(await getDepositsByUser(publicKey));
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const publicKey = await requirePublicKey();
    const { roundId, asset, signedXdr } = schema.parse(await req.json());
    const dep = await recordDeposit({ roundId, asset, publicKey, signedXdr });
    return created(dep);
  } catch (err) {
    return fromError(err);
  }
}
