// Internal Stellar/Soroban module. Import from '@/server/stellar' everywhere.
//   network.ts  — passphrase, Horizon + Soroban RPC clients, assets, contract ids
//   payments.ts — classic USDC payments + trustline + Horizon verification
//   pool.ts     — Soroban no-loss prize-pool contract client (XLM)
export * from './network';
export * from './payments';
export * from './pool';
