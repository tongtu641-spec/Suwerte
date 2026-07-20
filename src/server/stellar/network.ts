// Network + asset primitives shared by every Stellar/Soroban helper.
// One place owns the passphrase, the Horizon client, the Soroban RPC client,
// the asset/contract ids and the stroop<->decimal conversions.
import { Asset, Horizon, Networks, rpc } from '@stellar/stellar-sdk';
import type { AssetCode } from '@/lib/format';
import { env, USDC_ASSET_ISSUER_VALUE } from '@/server/config/env';

export function networkPassphrase(): string {
  if (env.STELLAR_NETWORK_PASSPHRASE) return env.STELLAR_NETWORK_PASSPHRASE;
  const map = { testnet: Networks.TESTNET, public: Networks.PUBLIC, futurenet: Networks.FUTURENET };
  return map[env.STELLAR_NETWORK];
}

export function horizon(): Horizon.Server {
  return new Horizon.Server(env.STELLAR_HORIZON_URL);
}

let sorobanServer: rpc.Server | null = null;
export function soroban(): rpc.Server {
  if (!sorobanServer) {
    sorobanServer = new rpc.Server(env.SOROBAN_RPC_URL, {
      allowHttp: env.SOROBAN_RPC_URL.startsWith('http://'),
    });
  }
  return sorobanServer;
}

export function assetFor(code: AssetCode): Asset {
  return code === 'XLM' ? Asset.native() : new Asset(env.USDC_ASSET_CODE, USDC_ASSET_ISSUER_VALUE);
}

export function usdcIssuer(): string {
  return USDC_ASSET_ISSUER_VALUE;
}

export function treasuryPublicKey(): string {
  return env.TREASURY_PUBLIC_KEY;
}

// Soroban contract ids.
export function poolContractId(): string {
  return env.SOROBAN_POOL_CONTRACT_ID;
}

export function xlmSacContractId(): string {
  return env.XLM_SAC_CONTRACT_ID;
}

// --- stroop helpers (7 decimals) -----------------------------------------

export function stroopsToAmount(stroops: string): string {
  const whole = BigInt(stroops) / 10_000_000n;
  const frac = (BigInt(stroops) % 10_000_000n).toString().padStart(7, '0');
  return `${whole}.${frac}`;
}

export function decToStroops(dec: string): string {
  const [whole, frac = ''] = dec.split('.');
  return (BigInt(whole) * 10_000_000n + BigInt((frac + '0000000').slice(0, 7) || '0')).toString();
}
