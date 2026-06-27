export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { destroySession } from '@/server/lib/session';

export async function POST() {
  try {
    await destroySession();
    return ok({ connected: false });
  } catch (err) {
    return fromError(err);
  }
}
