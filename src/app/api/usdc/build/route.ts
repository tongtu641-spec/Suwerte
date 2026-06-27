export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { buildTrustlineXdr } from '@/server/stellar';

export async function POST() {
  try {
    const pk = await requirePublicKey();
    const xdr = await buildTrustlineXdr(pk);
    return ok({ xdr });
  } catch (err) {
    return fromError(err);
  }
}
