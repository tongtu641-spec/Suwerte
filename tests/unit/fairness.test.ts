import { describe, it, expect } from 'vitest';
import { generateSeed, seedHash, verifySeed, pickWinner } from '../../src/server/lib/fairness';

describe('seed commit-reveal', () => {
  it('generates a 64-char hex seed', () => {
    const s = generateSeed();
    expect(s).toHaveLength(64);
    expect(s).toMatch(/^[0-9a-f]+$/);
  });

  it('hash is deterministic and verifiable', () => {
    const s = generateSeed();
    const h = seedHash(s);
    expect(h).toHaveLength(64);
    expect(verifySeed(s, h)).toBe(true);
    expect(verifySeed('tampered', h)).toBe(false);
  });
});

describe('pickWinner', () => {
  const holders = [
    { publicKey: 'GAAA', tickets: 5 },
    { publicKey: 'GBBB', tickets: 3 },
    { publicKey: 'GCCC', tickets: 2 },
  ];

  it('returns null with no tickets', () => {
    expect(pickWinner('seed', [])).toBeNull();
    expect(pickWinner('seed', [{ publicKey: 'GZZZ', tickets: 0 }])).toBeNull();
  });

  it('returns one of the holders', () => {
    const w = pickWinner('seed-123', holders);
    expect(holders.map((h) => h.publicKey)).toContain(w);
  });

  it('is deterministic for the same seed and holders', () => {
    expect(pickWinner('abc', holders)).toBe(pickWinner('abc', holders));
  });

  it('single holder always wins', () => {
    expect(pickWinner('x', [{ publicKey: 'GONLY', tickets: 4 }])).toBe('GONLY');
  });

  it('weighting favours larger ticket holders over many seeds', () => {
    const counts: Record<string, number> = { GAAA: 0, GBBB: 0, GCCC: 0 };
    for (let i = 0; i < 400; i++) {
      const w = pickWinner(`seed-${i}`, holders);
      if (w) counts[w]++;
    }
    expect(counts.GAAA).toBeGreaterThan(counts.GCCC);
  });
});
