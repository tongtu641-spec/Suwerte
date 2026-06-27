export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fromError } from '@/server/lib/http';
import { buildChallenge } from '@/server/lib/sep10';

const schema = z.object({ publicKey: z.string().length(56) });

export async function POST(req: NextRequest) {
  try {
    const { publicKey } = schema.parse(await req.json());
    const challenge = await buildChallenge(publicKey);
    return ok(challenge);
  } catch (err) {
    return fromError(err);
  }
}
