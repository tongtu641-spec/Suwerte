export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { buildDeposit } from '@/server/service/deposit.service';
import { toStroops } from '@/lib/format';

const schema = z.object({
  asset: z.enum(['XLM', 'USDC']),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, 'Enter a valid amount')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
});

export async function POST(req: NextRequest) {
  try {
    const from = await requirePublicKey();
    const { asset, amount } = schema.parse(await req.json());
    const xdr = await buildDeposit({ publicKey: from, asset, amountStroops: toStroops(amount) });
    return ok({ xdr });
  } catch (err) {
    return fromError(err);
  }
}
