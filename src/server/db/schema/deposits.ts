import { index, integer, pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { rounds } from './rounds';

export const DEPOSIT_STATUSES = ['confirmed', 'withdrawn'] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];
export const depositStatusEnum = pgEnum('deposit_status', DEPOSIT_STATUSES);

export const DEPOSIT_ASSETS = ['XLM', 'USDC'] as const;
export type DepositAsset = (typeof DEPOSIT_ASSETS)[number];
export const depositAssetEnum = pgEnum('deposit_asset', DEPOSIT_ASSETS);

// Each deposit is backed by a REAL on-chain payment (txHash) verified on Horizon.
export const deposits = pgTable(
  'deposits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(),
    asset: depositAssetEnum('asset').notNull().default('XLM'),
    amountStroops: text('amount_stroops').notNull(),
    tickets: integer('tickets').notNull().default(1),
    status: depositStatusEnum('status').notNull().default('confirmed'),
    txHash: text('tx_hash').notNull(),
    withdrawTxHash: text('withdraw_tx_hash'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roundIdx: index('deposits_round_idx').on(t.roundId),
    publicKeyIdx: index('deposits_public_key_idx').on(t.publicKey),
    statusIdx: index('deposits_status_idx').on(t.status),
    txUnique: unique('deposits_tx_hash_unique').on(t.txHash),
  }),
);

export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
