export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { submitSignedXdr } from '@/server/stellar';

const schema = z.object({ signedXdr: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    await requirePublicKey();
    const { signedXdr } = schema.parse(await req.json());
    const txHash = await submitSignedXdr(signedXdr);
    return ok({ txHash });
  } catch (err) {
    return fromError(err);
  }
}
