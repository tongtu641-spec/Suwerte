import { createHash, randomBytes } from 'node:crypto';

// Provably-fair commit-reveal draw.
// At round open the server commits to a secret seed by publishing sha256(seed).
// At draw the seed is revealed; anyone can recompute the winner and verify the
// published hash. No operator, participant, or validator can bias the result.

export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

export function seedHash(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

export function verifySeed(seed: string, hash: string): boolean {
  return seedHash(seed) === hash;
}

export interface TicketHolder {
  publicKey: string;
  tickets: number;
}

// Deterministic winner from the revealed seed + the ordered ticket holders.
export function pickWinner(seed: string, holders: TicketHolder[]): string | null {
  const totalTickets = holders.reduce((s, h) => s + Math.max(0, h.tickets), 0);
  if (totalTickets <= 0) return null;

  // Stable order so verification is reproducible regardless of DB ordering.
  const ordered = [...holders].sort((a, b) => a.publicKey.localeCompare(b.publicKey));
  const digest = createHash('sha256')
    .update(`${seed}:${ordered.map((h) => `${h.publicKey}=${h.tickets}`).join(',')}`)
    .digest('hex');

  const draw = BigInt(`0x${digest}`) % BigInt(totalTickets);
  let cursor = 0n;
  for (const h of ordered) {
    cursor += BigInt(Math.max(0, h.tickets));
    if (draw < cursor) return h.publicKey;
  }
  return ordered[ordered.length - 1]?.publicKey ?? null;
}
