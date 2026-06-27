export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { verifyChallenge } from '@/server/lib/sep10';
import { createSession } from '@/server/lib/session';

const schema = z.object({
  publicKey: z.string().length(56),
  signedTransaction: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signedTransaction } = schema.parse(await req.json());
    await verifyChallenge({ publicKey, signedTransaction });
    await createSession(publicKey);
    return ok({ publicKey });
  } catch (err) {
    return fromError(err);
  }
}
