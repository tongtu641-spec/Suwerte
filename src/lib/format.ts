// Stellar amounts use 7 decimals (stroops). 1 unit = 10,000,000 stroops.
// Stored everywhere as a stroop string (BigInt-safe). Never use float for money.

export const STROOPS_PER_UNIT = 10_000_000n;
export type AssetCode = 'XLM' | 'USDC';

export function toStroops(amount: string | number): string {
  const s = typeof amount === 'number' ? amount.toString() : amount.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('Invalid amount');
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '0000000').slice(0, 7);
  return (BigInt(whole) * STROOPS_PER_UNIT + BigInt(fracPadded || '0')).toString();
}

export function fromStroops(stroops: string | bigint): string {
  const n = typeof stroops === 'bigint' ? stroops : BigInt(stroops || '0');
  const whole = n / STROOPS_PER_UNIT;
  const frac = (n % STROOPS_PER_UNIT).toString().padStart(7, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

// Compact human display, e.g. 1234.5 -> "1,234.5"
export function formatAmount(stroops: string | bigint, opts?: { maxFrac?: number }): string {
  const raw = fromStroops(stroops);
  const [whole, frac = ''] = raw.split('.');
  const grouped = BigInt(whole).toLocaleString('en-US');
  const maxFrac = opts?.maxFrac ?? 4;
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, '');
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function addStroops(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function shortKey(pk: string | null | undefined): string {
  if (!pk) return '—';
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

export function explorerTx(hash: string): string {
  return `https://stellar.expert/explorer/${NETWORK === 'public' ? 'public' : 'testnet'}/tx/${hash}`;
}

export function explorerAccount(pk: string): string {
  return `https://stellar.expert/explorer/${NETWORK === 'public' ? 'public' : 'testnet'}/account/${pk}`;
}

// 1 raffle ticket per whole unit deposited, minimum 1 per deposit.
export function ticketsForStroops(stroops: string | bigint): number {
  const n = typeof stroops === 'bigint' ? stroops : BigInt(stroops || '0');
  const t = Number(n / STROOPS_PER_UNIT);
  return Math.max(1, t);
}
