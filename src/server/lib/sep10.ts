import { randomBytes } from 'node:crypto';
import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  TransactionBuilder,
  Transaction,
} from '@stellar/stellar-sdk';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { authNonces } from '@/server/db/schema';
import { AppError } from '@/server/lib/http';
import { networkPassphrase } from '@/server/stellar';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DATA_NAME = `${env.HOME_DOMAIN} auth`;

// Build a SEP-10-style challenge: a tx sourced by the server account (sequence 0)
// carrying a single manageData op sourced by the CLIENT account. The wallet signs
// it pinned to the app's network passphrase; the server verifies that signature.
export async function buildChallenge(clientPublicKey: string): Promise<{ transaction: string }> {
  try {
    Keypair.fromPublicKey(clientPublicKey);
  } catch {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }

  const server = Keypair.fromSecret(env.TREASURY_SECRET_KEY);
  // 32 random bytes -> 44 base64 chars, safely within the 64-byte manageData limit.
  const nonce = randomBytes(32).toString('base64');

  // Account sequence "-1" so the built transaction's sequence is "0" (SEP-10 rule).
  const serverAccount = new Account(server.publicKey(), '-1');
  const tx = new TransactionBuilder(serverAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      Operation.manageData({ name: DATA_NAME, value: nonce, source: clientPublicKey }),
    )
    .setTimeout(CHALLENGE_TTL_MS / 1000)
    .build();
  tx.sign(server);

  await db.insert(authNonces).values({
    nonce,
    publicKey: clientPublicKey,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  return { transaction: tx.toXDR() };
}

// Verify the signed challenge: decode it pinned to our passphrase, extract the
// nonce we issued for this public key, and confirm the client signed the tx hash.
export async function verifyChallenge(input: {
  publicKey: string;
  signedTransaction: string;
}): Promise<void> {
  let tx: Transaction;
  try {
    tx = new Transaction(input.signedTransaction, networkPassphrase());
  } catch {
    throw new AppError('INVALID_INPUT', 'Malformed signed transaction', 400);
  }

  const dataOp = tx.operations.find(
    (op) => op.type === 'manageData' && op.name === DATA_NAME,
  ) as Extract<(typeof tx.operations)[number], { type: 'manageData' }> | undefined;
  if (!dataOp || !dataOp.value) throw new AppError('INVALID_INPUT', 'Challenge op missing', 400);

  // manageData carries the base64 nonce string as UTF-8 bytes; decode back to it.
  const nonce = dataOp.value.toString('utf8');

  const [record] = await db
    .select()
    .from(authNonces)
    .where(
      and(
        eq(authNonces.nonce, nonce),
        eq(authNonces.publicKey, input.publicKey),
        isNull(authNonces.consumedAt),
        gt(authNonces.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!record) throw new AppError('UNAUTHORIZED', 'Challenge expired or invalid', 401);

  const kp = Keypair.fromPublicKey(input.publicKey);
  const hash = tx.hash();
  const signed = tx.signatures.some((sig) => {
    try {
      return kp.verify(hash, sig.signature());
    } catch {
      return false;
    }
  });
  if (!signed) throw new AppError('UNAUTHORIZED', 'Signature does not match public key', 401);

  await db.update(authNonces).set({ consumedAt: new Date() }).where(eq(authNonces.nonce, nonce));
}
