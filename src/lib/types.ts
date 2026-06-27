export interface UserPosition {
  tickets: number;
  principalStroops: string;
  usdcStroops: string;
  count: number;
}

export interface HistoryRound {
  roundNumber: number;
  winnerPublicKey: string | null;
  prizeStroops: string | null;
  drawTxHash: string | null;
  seedHash: string;
  serverSeed: string | null;
  drawAt: string | null;
}

export interface CurrentRound {
  round: {
    id: string;
    roundNumber: number;
    status: 'open' | 'drawing' | 'completed';
    seedHash: string;
    closesAt: string | null;
  };
  principalStroops: string;
  usdcPrincipalStroops: string;
  playerCount: number;
  ticketCount: number;
  prizeStroops: string;
  position: UserPosition | null;
  treasury: string;
  usdc: { code: string };
  history: HistoryRound[];
}

export interface Deposit {
  id: string;
  roundId: string;
  publicKey: string;
  asset: 'XLM' | 'USDC';
  amountStroops: string;
  tickets: number;
  status: 'confirmed' | 'withdrawn';
  txHash: string;
  withdrawTxHash: string | null;
  createdAt: string;
  roundNumber: number;
  roundStatus: 'open' | 'drawing' | 'completed';
}

export interface AccountBalances {
  funded: boolean;
  xlm: string;
  usdc: string;
  hasUsdcTrust: boolean;
}

export interface Stats {
  uniqueWallets: number;
  logins: number;
  rounds: number;
  completedRounds: number;
  deposits: number;
  totalDepositedXlm: string;
  prizesPaidXlm: string;
  winners: number;
}
