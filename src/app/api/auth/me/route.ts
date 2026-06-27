export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { getSessionPublicKey } from '@/server/lib/session';

export async function GET() {
  try {
    const publicKey = await getSessionPublicKey();
    return ok({ publicKey, connected: Boolean(publicKey) });
  } catch (err) {
    return fromError(err);
  }
}
