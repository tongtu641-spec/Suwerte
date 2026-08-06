export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { getStats } from '@/server/service/stats.service';

export async function GET() {
  try {
    return ok(await getStats());
  } catch (err) {
    return fromError(err);
  }
}
