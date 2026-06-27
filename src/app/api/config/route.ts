export const dynamic = 'force-dynamic';

import { ok, fromError } from '@/server/lib/http';
import { env } from '@/server/config/env';
import { usdcIssuer } from '@/server/stellar';

export async function GET() {
  try {
    return ok({
      treasury: env.TREASURY_PUBLIC_KEY,
      network: env.STELLAR_NETWORK,
      networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
      horizonUrl: env.STELLAR_HORIZON_URL,
      sorobanRpcUrl: env.SOROBAN_RPC_URL,
      poolContractId: env.SOROBAN_POOL_CONTRACT_ID,
      xlmSacContractId: env.XLM_SAC_CONTRACT_ID,
      usdc: { code: env.USDC_ASSET_CODE, issuer: usdcIssuer() },
    });
  } catch (err) {
    return fromError(err);
  }
}
