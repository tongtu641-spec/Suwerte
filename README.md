# Suwerte

**Save together. Nobody loses. Someone wins.**

Suwerte (Filipino for *luck*) is a no-loss prize pool on Stellar. You deposit XLM into a
weekly round and collect raffle tickets. When the round is drawn, one wallet takes the
sponsored prize — and **everyone else keeps every stroop of their principal**, withdrawable
on-chain at any time. The only thing you can win is the prize; the only thing you can lose is
the suspense.

**Live on Stellar Testnet → https://suwerte.vercel.app**

![Landing](../screen-shot/01-landing.jpg)

---

## Why it exists

Lotteries ask you to throw money away for a tiny chance at a prize. Savings accounts keep your
money safe but pay almost nothing and feel like nothing. Prize-linked savings sit in the middle:
your stake is always returned, and the yield that *would* have been spread thinly across everyone
is instead pooled into one prize that goes to a single lucky saver. It turns the discipline of
saving into something that feels like play — without the downside.

Suwerte brings that idea on-chain, where the draw is provable and the money movement is public.

## How a round works

1. **Connect** — link Freighter and sign a one-time SEP-10 challenge. No password, no custody.
2. **Deposit XLM** — you sign a Soroban `deposit(saver, amount)` call that escrows your XLM in the
   pool contract. Your principal is tracked on-chain, per wallet, and every whole unit becomes one
   raffle ticket. (USDC is opt-in too — one tap enables the trustline.)
3. **Draw** — the treasury funds the prize into the contract, then calls `draw()`. The **contract
   itself** selects the winner on-chain, weighted by principal, using Soroban's PRNG, and pays the
   prize from the prize pool in the same transaction.
4. **Win or withdraw** — the winner receives the prize on-chain. Everyone else signs a
   `withdraw(saver, amount)` to pull their full principal back out of the contract whenever the
   round is open. A draw can never reduce principal — the no-loss rule is enforced in Rust.

![Play](../screen-shot/05-deposit-success.jpg)

## What makes it real

- **A real Soroban contract.** `suwerte-pool` (Rust, soroban-sdk 22) custodies every saver's
  principal and runs the draw. Deposits, withdrawals, prize funding and the principal-weighted
  winner selection all happen on-chain — the "no-loss" promise is code, not a backend policy.
  Live at [`CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I`](https://stellar.expert/explorer/testnet/contract/CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I).
- **Real SEP-10 auth.** Connecting builds a challenge transaction, signs it pinned to the app's
  network passphrase (testnet — *not* the wallet's active network), and verifies the signature
  server-side before issuing a session cookie.
- **Real on-chain money.** Deposits/withdrawals are saver-signed contract calls; the draw is an
  admin-signed contract call that pays the winner. The server records a deposit only after the
  chain confirms it, reading the amount straight from the signed transaction. Every action shows a
  tx hash that links to stellar.expert.
- **No-loss enforced on-chain.** `draw()` only ever moves the separately-funded prize pool;
  principal is a distinct balance the contract refuses to raffle. The Rust test suite proves it.
- **XLM by default, USDC opt-in.** Native XLM is the contract-backed savings asset and needs no
  trustline. USDC is offered alongside with a one-tap "Enable USDC" that builds and submits a
  `changeTrust`.
- **No fake data.** Stats and history come only from real wallets completing real flows. Empty
  states say "nothing yet" instead of inventing people.

## Smart contract

`contracts/suwerte-pool` — the no-loss prize-pool, written in Rust on `soroban-sdk` 22.

| Entry point | Auth | What it does |
|---|---|---|
| `initialize(admin, token)` | admin | One-time setup; pins the admin + escrow token (XLM SAC) |
| `deposit(saver, amount)` | saver | Pulls `amount` into the pool; credits the saver's principal |
| `withdraw(saver, amount)` | saver | Returns principal to the saver — always, no loss |
| `fund_prize(funder, amount)` | funder | Tops up the prize the next draw pays |
| `draw()` | admin | Picks a principal-weighted winner via PRNG; pays the prize pool |

Views: `principal_of`, `total_principal`, `prize_pool`, `total_savers`, `draw_count`,
`last_winner`, `last_prize`, `is_paused`, `get_admin`, `get_token`.

```bash
cd contracts
cargo +1.89.0 test                 # 12 tests, incl. the no-loss invariant
NETWORK=testnet ./scripts/deploy.sh  # build, optimize, deploy, initialize
```

Deployment details (ids, tx hashes, wasm hash) live in `contracts/DEPLOYMENT.md`.

## Screens

| | |
|---|---|
| ![Connect](../screen-shot/02-connect-popup.jpg) | ![Deposit](../screen-shot/04-deposit.jpg) |
| ![Stats](../screen-shot/06-stats.jpg) | ![Mobile](../screen-shot/07-mobile.jpg) |

## Stack

- **Next.js 16** (App Router, React 19) — UI and API routes in one app.
- **Tailwind CSS v4** — the dark "lucky lantern" design system (gold on indigo).
- **Drizzle ORM + Postgres (Supabase)** — rounds, deposits, sessions, auth nonces.
- **Rust + soroban-sdk 22** — the `suwerte-pool` smart contract (deposit/withdraw/draw).
- **@stellar/stellar-sdk** — Soroban RPC (build/prepare/submit invocations), SEP-10, Horizon.
- **@stellar/freighter-api** — wallet connection and transaction signing.
- **Vitest + cargo test + Playwright** — unit tests, 12 contract tests, an on-chain e2e on prod.

## Stellar integration

- **Soroban contract** `suwerte-pool` escrows principal and runs the no-loss draw on-chain.
- Saver-signed `deposit` / `withdraw` invocations via Soroban RPC (`src/server/stellar/pool.ts`).
- Admin-signed `fund_prize` + `draw`; the winner is selected and paid by the contract.
- Native XLM is moved through its Stellar Asset Contract (SAC) — no trustline needed.
- SEP-10 challenge/verify for wallet auth (`/api/auth/challenge`, `/api/auth/verify`).
- `changeTrust` helper + Horizon verification for the opt-in USDC path.

## Routes

| Path | What |
|---|---|
| `/` | Landing — live round, how it works, recent winners |
| `/play` | The product — deposit, position, withdraw, run the draw |
| `/stats` | Real interaction counts |
| `/api/auth/*` | `challenge`, `verify`, `me`, `logout` (SEP-10 + session) |
| `/api/round/current` · `/api/round/draw` | Round state and the on-chain draw |
| `/api/deposits` · `/api/deposits/build` | Submit / build a contract deposit |
| `/api/deposits/withdraw` · `/api/deposits/withdraw/build` | Submit / build a contract withdraw |
| `/api/usdc/build` · `/api/usdc/submit` | Enable USDC trustline |
| `/api/account/balances` · `/api/config` · `/api/stats` | Account, config, metrics |

## Quick start

```bash
pnpm install

# create .env.local with the keys below, then push the schema
pnpm run db:push

# run
pnpm dev            # http://localhost:3002
```

### Required environment

```
DRIZZLE_DATABASE_URL           # Postgres connection string
NEXT_PUBLIC_STELLAR_NETWORK    # testnet
STELLAR_HORIZON_URL            # https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE     # Test SDF Network ; September 2015
SOROBAN_RPC_URL                # https://soroban-testnet.stellar.org
SOROBAN_POOL_CONTRACT_ID       # CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I
NEXT_PUBLIC_POOL_CONTRACT_ID   # same id, exposed to the client for explorer links
XLM_SAC_CONTRACT_ID            # CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
TREASURY_PUBLIC_KEY            # contract admin + prize funder + SEP-10 server
TREASURY_SECRET_KEY            # signs fund_prize/draw + SEP-10 challenges (testnet)
SESSION_SECRET                 # >= 32 chars
USDC_ASSET_ISSUER_TESTNET      # testnet USDC issuer
PRIZE_BASE_UNITS               # base prize in XLM (default 2)
PRIZE_RATE_BPS                 # % of pool added to the prize (default 500 = 5%)
```

## Tests

```bash
pnpm test                                          # unit: fairness, amounts, http
( cd contracts && cargo +1.89.0 test )             # 12 contract tests (incl. no-loss)
PLAYWRIGHT_BASE_URL=https://suwerte.vercel.app \
  pnpm exec playwright test                        # on-chain e2e against prod
```

The e2e emulates Freighter via its real `postMessage` bridge and signs with a Node keypair, then
drives connect → deposit on the live deployment, producing a real testnet transaction.

---

Built for the Stellar APAC Hackathon · Track: Savings & DeFi · Testnet only.
