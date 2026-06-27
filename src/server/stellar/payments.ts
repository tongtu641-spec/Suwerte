// Classic (non-Soroban) Stellar payment helpers: USDC deposits route through a
// treasury payment + Horizon verification, and the one-tap USDC trustline.
// XLM deposits/withdrawals/draws go through the Soroban pool contract instead
// (see ./pool.ts) — this file is the classic-asset half of the system.
import {
  BASE_FEE,
  type Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { AssetCode } from '@/lib/format';
import { env } from '@/server/config/env';
import { AppError } from '@/server/lib/http';
import { assetFor, decToStroops, horizon, networkPassphrase, stroopsToAmount } from './network';

function assetMatches(
  op: { asset_type?: string; asset_code?: string; asset_issuer?: string },
  code: AssetCode,
): boolean {
  if (code === 'XLM') return op.asset_type === 'native';
  return op.asset_code === env.USDC_ASSET_CODE && op.asset_issuer === assetFor('USDC').issuer;
}

export interface VerifiedPayment {
  amountStroops: string;
  from: string;
  createdAt: string;
}

// Verify a REAL on-chain payment landed: tx succeeded and contains a payment op
// from `from` to the treasury for the given asset (amount returned, not trusted).
export async function verifyDepositPayment(input: {
  txHash: string;
  from: string;
  asset: AssetCode;
}): Promise<VerifiedPayment> {
  const server = horizon();
  let tx: Horizon.ServerApi.TransactionRecord;
  try {
    tx = await server.transactions().transaction(input.txHash).call();
  } catch {
    throw new AppError('NOT_FOUND', 'Transaction not found on Horizon yet', 404);
  }
  if (!tx.successful) throw new AppError('INVALID_INPUT', 'Transaction did not succeed', 400);

  const ops = await server.operations().forTransaction(input.txHash).limit(50).call();
  const payment = ops.records.find((op) => {
    const o = op as unknown as {
      type: string;
      from?: string;
      to?: string;
      asset_type?: string;
      asset_code?: string;
      asset_issuer?: string;
    };
    return (
      (o.type === 'payment' || o.type === 'create_account') &&
      o.from === input.from &&
      o.to === env.TREASURY_PUBLIC_KEY &&
      assetMatches(o, input.asset)
    );
  });

  if (!payment) {
    throw new AppError(
      'INVALID_INPUT',
      'No matching payment to the treasury found in this transaction',
      400,
    );
  }

  const o = payment as unknown as { amount?: string; from?: string; created_at?: string };
  const whole = (o.amount ?? '0').split('.')[0];
  const frac = ((o.amount ?? '0').split('.')[1] ?? '').padEnd(7, '0').slice(0, 7);
  const amountStroops = (BigInt(whole) * 10_000_000n + BigInt(frac || '0')).toString();

  return { amountStroops, from: o.from ?? input.from, createdAt: o.created_at ?? tx.created_at };
}

// Server-signed payout from the treasury -> recipient (USDC principal refund).
export async function treasuryPay(input: {
  to: string;
  amountStroops: string;
  asset: AssetCode;
}): Promise<string> {
  const server = horizon();
  const kp = Keypair.fromSecret(env.TREASURY_SECRET_KEY);
  const account = await server.loadAccount(kp.publicKey());

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  }).addOperation(
    Operation.payment({
      destination: input.to,
      asset: assetFor(input.asset),
      amount: stroopsToAmount(input.amountStroops),
    }),
  );

  const tx = builder.setTimeout(60).build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return res.hash;
}

// Build an UNSIGNED USDC payment to the treasury for the wallet to sign.
export async function buildDepositXdr(input: {
  from: string;
  amountStroops: string;
  asset: AssetCode;
}): Promise<string> {
  const server = horizon();
  const account = await server.loadAccount(input.from);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      Operation.payment({
        destination: env.TREASURY_PUBLIC_KEY,
        asset: assetFor(input.asset),
        amount: stroopsToAmount(input.amountStroops),
      }),
    )
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

// Build an UNSIGNED changeTrust so a wallet can opt in to USDC (one-tap enable).
export async function buildTrustlineXdr(account: string): Promise<string> {
  const server = horizon();
  const acct = await server.loadAccount(account);
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(Operation.changeTrust({ asset: assetFor('USDC') }))
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

// Submit a signed CLASSIC transaction through Horizon.
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  const server = horizon();
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase());
  const res = await server.submitTransaction(tx);
  return res.hash;
}

export interface AccountBalances {
  funded: boolean;
  xlm: string; // stroops
  usdc: string; // stroops
  hasUsdcTrust: boolean;
}

export async function getAccountBalances(pk: string): Promise<AccountBalances> {
  const server = horizon();
  try {
    const acct = await server.loadAccount(pk);
    let xlm = '0';
    let usdc = '0';
    let hasUsdcTrust = false;
    const usdcIssuer = assetFor('USDC').issuer;
    for (const b of acct.balances) {
      if (b.asset_type === 'native') xlm = decToStroops(b.balance);
      else if (
        'asset_code' in b &&
        b.asset_code === env.USDC_ASSET_CODE &&
        'asset_issuer' in b &&
        b.asset_issuer === usdcIssuer
      ) {
        usdc = decToStroops(b.balance);
        hasUsdcTrust = true;
      }
    }
    return { funded: true, xlm, usdc, hasUsdcTrust };
  } catch {
    return { funded: false, xlm: '0', usdc: '0', hasUsdcTrust: false };
  }
}
