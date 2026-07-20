export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { requirePublicKey } from '@/server/lib/session';
import { getAccountBalances } from '@/server/stellar';

export async function GET() {
  try {
    const pk = await requirePublicKey();
    return ok(await getAccountBalances(pk));
  } catch (err) {
    return fromError(err);
  }
}
