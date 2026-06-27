import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A weekly prize-savings round. Deposits flow in; one winner takes the sponsored prize.
export const ROUND_STATUSES = ['open', 'drawing', 'completed'] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];
export const roundStatusEnum = pgEnum('round_status', ROUND_STATUSES);

export const rounds = pgTable(
  'rounds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roundNumber: integer('round_number').notNull(),
    status: roundStatusEnum('status').notNull().default('open'),
    // Provably-fair commit: sha256(serverSeed) published at open, seed revealed at draw.
    seedHash: text('seed_hash').notNull(),
    serverSeed: text('server_seed'),
    // Winner + sponsored prize (paid on-chain in XLM from the treasury).
    winnerPublicKey: text('winner_public_key'),
    prizeStroops: text('prize_stroops'),
    drawTxHash: text('draw_tx_hash'),
    drawAt: timestamp('draw_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roundIdx: index('rounds_round_idx').on(t.roundNumber),
    statusIdx: index('rounds_status_idx').on(t.status),
  }),
);

export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;
