export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { withdrawDeposit } from '@/server/service/deposit.service';

const schema = z.object({
  depositId: z.string().uuid(),
  // Required for XLM (contract) withdrawals; omitted for USDC treasury refunds.
  signedXdr: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const publicKey = await requirePublicKey();
    const { depositId, signedXdr } = schema.parse(await req.json());
    const dep = await withdrawDeposit({ depositId, publicKey, signedXdr });
    return ok(dep);
  } catch (err) {
    return fromError(err);
  }
}
