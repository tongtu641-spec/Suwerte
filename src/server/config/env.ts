import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_APP_NAME: z.string().default('Suwerte'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3002'),

  DRIZZLE_DATABASE_URL: z.string().url(),

  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),

  // Suwerte no-loss prize-pool Soroban contract (XLM savings live here).
  SOROBAN_POOL_CONTRACT_ID: z
    .string()
    .default('CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I'),
  NEXT_PUBLIC_POOL_CONTRACT_ID: z
    .string()
    .default('CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I'),
  // Native XLM Stellar Asset Contract — the pool's escrow token (no trustline).
  XLM_SAC_CONTRACT_ID: z
    .string()
    .default('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'),

  USDC_ASSET_CODE: z.string().default('USDC'),
  USDC_ASSET_ISSUER_TESTNET: z
    .string()
    .default('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),
  USDC_ASSET_ISSUER_PUBLIC: z
    .string()
    .default('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),

  // Treasury / pool account. Receives deposits, signs payouts and SEP-10 challenges.
  TREASURY_PUBLIC_KEY: z
    .string()
    .default('GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47'),
  TREASURY_SECRET_KEY: z
    .string()
    .default('SDL4SWRGFBZ5XBB5EORL3BHLUSETFBVVQ6OIESURFR7D4BFQQJKMJI3P'),

  // Weekly prize the treasury sponsors = base + rate of the round's principal.
  PRIZE_BASE_UNITS: z.coerce.number().nonnegative().default(2),
  PRIZE_RATE_BPS: z.coerce.number().int().nonnegative().default(500), // 5%

  // Comma-separated public keys to exclude from public stats (demo/seed keys).
  STATS_EXCLUDE_KEYS: z.string().default(''),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_COOKIE_NAME: z.string().default('suwerte_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),

  HOME_DOMAIN: z.string().default('suwerte.vercel.app'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const rawEnv = parsed.data;

export const USDC_ASSET_ISSUER_VALUE: string =
  rawEnv.STELLAR_NETWORK === 'public'
    ? rawEnv.USDC_ASSET_ISSUER_PUBLIC
    : rawEnv.USDC_ASSET_ISSUER_TESTNET;

export const env = rawEnv;
export type Env = typeof env;
