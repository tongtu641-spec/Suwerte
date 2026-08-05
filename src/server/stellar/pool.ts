// Soroban client for the Suwerte no-loss prize-pool contract.
//
// XLM is the contract-backed savings asset. Savers sign `deposit`/`withdraw`
// invocations themselves (their principal is escrowed in, and only ever returned
// from, the contract). The admin/treasury signs `fund_prize` + `draw`, which the
// contract settles on-chain by paying a principal-weighted winner. Principal is
// never touched by a draw — that is the no-loss guarantee, enforced in Rust.
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  type xdr,
} from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { AppError } from '@/server/lib/http';
import { networkPassphrase, poolContractId, soroban } from './network';

const SOROBAN_FEE = '2000000'; // 0.2 XLM inclusion ceiling; resource fee added on prepare.

function contract(): Contract {
  return new Contract(poolContractId());
}

function i128(stroops: string): xdr.ScVal {
  return nativeToScVal(BigInt(stroops), { type: 'i128' });
}

function addr(pk: string): xdr.ScVal {
  return new Address(pk).toScVal();
}

// Build a prepared (simulated + assembled) invocation for a saver to sign in
// their wallet. The saver is the transaction source, so their wallet signature
// satisfies both the contract's `require_auth` and the inner SAC transfer.
async function buildUserInvoke(saver: string, method: string, stroops: string): Promise<string> {
  const account = await soroban().getAccount(saver);
  const tx = new TransactionBuilder(account, {
    fee: SOROBAN_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(contract().call(method, addr(saver), i128(stroops)))
    .setTimeout(180)
    .build();
  const prepared = await soroban().prepareTransaction(tx);
  return prepared.toXDR();
}

export function buildDepositInvoke(saver: string, amountStroops: string): Promise<string> {
  return buildUserInvoke(saver, 'deposit', amountStroops);
}

export function buildWithdrawInvoke(saver: string, amountStroops: string): Promise<string> {
  return buildUserInvoke(saver, 'withdraw', amountStroops);
}

export interface ParsedInvoke {
  contractId: string;
  method: string;
  from: string;
  amountStroops: string;
}

// Decode a signed Soroban tx and assert it really calls our pool contract with
// `method(from, amount)`. This is the on-chain analogue of payment verification:
// we record exactly what the user authorized, never what the client claims.
export function parsePoolInvoke(
  signedXdr: string,
  method: string,
  expectedFrom: string,
): ParsedInvoke {
  let tx: ReturnType<typeof TransactionBuilder.fromXDR>;
  try {
    tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase());
  } catch {
    throw new AppError('INVALID_INPUT', 'Could not decode the signed transaction', 400);
  }
  const ops = 'operations' in tx ? tx.operations : [];
  const op = ops[0] as { type?: string; func?: xdr.HostFunction } | undefined;
  if (!op || op.type !== 'invokeHostFunction' || !op.func) {
    throw new AppError('INVALID_INPUT', 'Transaction is not a contract invocation', 400);
  }
  let invoke: xdr.InvokeContractArgs;
  try {
    invoke = op.func.invokeContract();
  } catch {
    throw new AppError('INVALID_INPUT', 'Transaction does not invoke a contract', 400);
  }

  const contractId = Address.fromScAddress(invoke.contractAddress()).toString();
  if (contractId !== poolContractId()) {
    throw new AppError('INVALID_INPUT', 'Transaction targets a different contract', 400);
  }
  const fn = invoke.functionName().toString();
  if (fn !== method) {
    throw new AppError('INVALID_INPUT', `Expected a ${method} call, got ${fn}`, 400);
  }
  const args = invoke.args();
  const from = String(scValToNative(args[0]));
  const amountStroops = BigInt(scValToNative(args[1]) as bigint).toString();
  if (from !== expectedFrom) {
    throw new AppError('FORBIDDEN', 'Signed transaction is for a different account', 403);
  }
  if (BigInt(amountStroops) <= 0n) {
    throw new AppError('INVALID_INPUT', 'Amount must be greater than zero', 400);
  }
  return { contractId, method: fn, from, amountStroops };
}

async function pollForSuccess(
  hash: string,
  label: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const server = soroban();
  for (let i = 0; i < 30; i++) {
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return got;
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new AppError('INTERNAL', `${label} failed on-chain`, 502);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new AppError('INTERNAL', `${label} did not confirm in time`, 504);
}

// Submit a user-signed Soroban tx (deposit/withdraw) and wait for success.
export async function submitSignedSorobanXdr(
  signedXdr: string,
  label = 'Transaction',
): Promise<string> {
  const server = soroban();
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase());
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new AppError('INTERNAL', `${label} was rejected by the network`, 502);
  }
  await pollForSuccess(sent.hash, label);
  return sent.hash;
}

// Server (admin/treasury) signs + submits a Soroban invocation and waits.
async function adminInvoke(
  method: string,
  args: xdr.ScVal[],
  label: string,
): Promise<rpc.Api.GetSuccessfulTransactionResponse & { hash: string }> {
  const server = soroban();
  const kp = Keypair.fromSecret(env.TREASURY_SECRET_KEY);
  const account = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: SOROBAN_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(180)
    .build();
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new AppError('INTERNAL', `${label} was rejected by the network`, 502);
  }
  const got = await pollForSuccess(sent.hash, label);
  return Object.assign(got, { hash: sent.hash });
}

// Treasury tops up the prize the next draw pays out.
export async function adminFundPrize(amountStroops: string): Promise<string> {
  const treasury = Keypair.fromSecret(env.TREASURY_SECRET_KEY).publicKey();
  const res = await adminInvoke(
    'fund_prize',
    [addr(treasury), i128(amountStroops)],
    'Prize funding',
  );
  return res.hash;
}

export interface DrawResult {
  winner: string;
  txHash: string;
}

// Admin-only on-chain draw. The contract selects the winner (weighted by
// principal) and pays them the prize; we read the winner back from the result.
export async function adminDraw(): Promise<DrawResult> {
  const res = await adminInvoke('draw', [], 'Draw');
  const winner = res.returnValue ? String(scValToNative(res.returnValue)) : '';
  if (!winner) throw new AppError('INTERNAL', 'Draw did not return a winner', 502);
  return { winner, txHash: res.hash };
}

// --- read-only views (simulation, no fee) --------------------------------

async function simRead(method: string, args: xdr.ScVal[] = []): Promise<unknown> {
  const server = soroban();
  // Any existing account can source a simulation; the treasury always exists.
  const kp = Keypair.fromSecret(env.TREASURY_SECRET_KEY);
  const account = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(contract().call(method, ...args))
    .setTimeout(60)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new AppError('INTERNAL', `Contract read (${method}) failed`, 502);
  }
  return scValToNative(sim.result.retval);
}

export interface PoolStats {
  totalPrincipalStroops: string;
  prizePoolStroops: string;
  totalSavers: number;
  drawCount: number;
}

export async function getPoolStats(): Promise<PoolStats> {
  const [total, prize, savers, draws] = await Promise.all([
    simRead('total_principal'),
    simRead('prize_pool'),
    simRead('total_savers'),
    simRead('draw_count'),
  ]);
  return {
    totalPrincipalStroops: BigInt((total as bigint) ?? 0n).toString(),
    prizePoolStroops: BigInt((prize as bigint) ?? 0n).toString(),
    totalSavers: Number(savers ?? 0),
    drawCount: Number(draws ?? 0),
  };
}

export async function getPrincipalOf(saver: string): Promise<string> {
  const v = await simRead('principal_of', [addr(saver)]);
  return BigInt((v as bigint) ?? 0n).toString();
}
