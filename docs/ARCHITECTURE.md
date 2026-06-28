ARCHITECTURE

Suwerte is a no-loss prize-linked savings app on Stellar testnet. Savers deposit XLM into a Soroban contract that escrows principal, the contract picks a principal-weighted winner and pays the sponsored prize, and every other saver can withdraw their full principal at any time. The no-loss guarantee is enforced in Rust on-chain, not in the backend.


STACK

1. FRONTEND
   Next.js 16.2.7 with the App Router, React 19.2.4, TypeScript 5, Tailwind CSS v4 with the dark lucky-lantern design system. Client components live in src/components and under src/app. Wallet context is a React provider in src/lib/wallet.tsx that wraps Freighter, surfaces the connected public key, and exposes a signXdr helper.

2. BACKEND
   Next.js route handlers under src/app/api. Each route is a thin adapter that validates input with Zod, calls a service in src/server/service, and returns the standard envelope defined in src/server/lib/http.ts (ok, created, fromError, AppError with code, message, status, details). Cross-cutting helpers sit in src/server/lib (sep10, session, fairness, http).

3. DATABASE
   Drizzle ORM 0.45.2 on top of Postgres, currently hosted on Supabase. Schemas live in src/server/db/schema; the connection pool is initialised once in src/server/db/client.ts. Drizzle Kit pushes the schema with pnpm run db:push, which reads DRIZZLE_DATABASE_URL.

4. BLOCKCHAIN
   Stellar testnet. Smart contract suwerte-pool is Rust on soroban-sdk 22 in contracts/suwerte-pool; the WASM is deployed at CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I. XLM flows through the native XLM Stellar Asset Contract at CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC. Soroban RPC at soroban-testnet.stellar.org and Horizon at horizon-testnet.stellar.org are both used. The app signs server-side ops with @stellar/stellar-sdk 15.1.0.

5. WALLET
   Freighter via @stellar/freighter-api 6.0.1. The wallet provider uses requestAccess, getAddress, and signTransaction pinned to the testnet passphrase (NETWORK_PASSPHRASE). All saver-side transactions are built unsigned on the server and submitted through Freighter.


DIRECTORY LAYOUT

1. src/app/page.tsx, src/app/layout.tsx — Next.js App Router root. The root layout mounts WalletProvider and the site header, footer, and toast region.

2. src/app/play/page.tsx — the product page. Lists the current round, the user position, the deposit form, the withdraw control, and a Run the draw button.

3. src/app/stats/page.tsx — read-only metrics page that calls /api/stats.

4. src/app/draw/page.tsx and src/app/savings/page.tsx — supporting screens for the round and savings flows.

5. src/app/api/auth/challenge, /verify, /me, /logout — SEP-10 challenge build, signed-tx verify, session probe, session destroy.

6. src/app/api/round/current, /api/round/draw — read the active round, admin-signed run of the on-chain draw.

7. src/app/api/deposits, /deposits/build, /deposits/withdraw, /deposits/withdraw/build — record deposit, build deposit XDR, record withdraw, build withdraw XDR.

8. src/app/api/usdc/build, /usdc/submit — build the unsigned changeTrust or USDC payment XDR; submit a signed classic tx.

9. src/app/api/account/balances — Horizon-derived XLM + USDC balances plus the USDC trustline flag for the connected wallet.

10. src/app/api/config — public Stellar network and contract ids, exposed to the client.

11. src/app/api/stats — the public metrics used by the landing and /stats screens.

12. src/server/controller — present in the repo layout but route handlers are colocated with the API routes under src/app/api; the service layer is what does the real work.

13. src/server/service/deposit.service.ts — deposit + withdraw orchestration. Builds XDR, submits, parses the on-chain result, persists the row, never trusts the client.

14. src/server/service/round.service.ts — round lifecycle. ensureCurrentRound opens a new weekly round with a server seed; executeDraw funds the prize on-chain, runs draw(), persists the winner and tx hash, and immediately opens the next round.

15. src/server/service/stats.service.ts — aggregates unique wallets, logins, deposits, total XLM deposited, prizes paid, and winners, excluding any keys listed in STATS_EXCLUDE_KEYS.

16. src/server/stellar/pool.ts — Soroban client. buildDepositInvoke and buildWithdrawInvoke produce prepared XDR for the saver to sign; adminFundPrize and adminDraw sign and submit admin ops; parsePoolInvoke decodes a signed Soroban tx and asserts it really calls our pool contract with deposit or withdraw from the expected saver; getPoolStats and getPrincipalOf are read-only simulations.

17. src/server/stellar/payments.ts — classic-asset helpers. verifyDepositPayment checks a Horizon tx for a matching payment op; treasuryPay is the server-signed USDC refund; buildTrustlineXdr produces the one-tap USDC trustline; getAccountBalances reads native + USDC balances and the trustline flag.

18. src/server/stellar/network.ts, index.ts — single source of truth for Horizon and Soroban RPC clients, the network passphrase, the pool contract id, and asset metadata.

19. src/server/lib/sep10.ts — buildChallenge and verifyChallenge. The challenge is a manageData op sourced by the client with a 32-byte base64 nonce and signed by both the treasury and the client. The nonce row in auth_nonces is consumed on verify.

20. src/server/lib/session.ts — createSession writes a sessions row, sets the cookie. getSessionPublicKey and destroySession read or delete it. requirePublicKey is the gate used by every authenticated API route.

21. src/server/lib/fairness.ts — provably-fair commit-reveal. generateSeed returns 32 random hex bytes; seedHash returns sha256(seed); verifySeed confirms a revealed seed against its hash; pickWinner is the deterministic ticket-walk that anyone can re-run with the revealed seed.

22. src/server/lib/http.ts — ok, created, fromError, AppError, ZodError-to-issues translation. Every route returns the { ok, data } envelope.

23. src/server/db/client.ts — Drizzle + pg pool, initialised lazily.

24. src/server/db/schema/rounds.ts — rounds table, status enum open | drawing | completed, serverSeed hidden until draw, winner and prize stored on completion.

25. src/server/db/schema/deposits.ts — deposits table, status enum confirmed | withdrawn, asset enum XLM | USDC, unique on txHash, indexed by round, publicKey, and status.

26. src/server/db/schema/sessions.ts — sessions table keyed by uuid, publicKey, expiresAt. The cookie holds only the row id; everything else is server-side.

27. src/server/db/schema/authNonces.ts — auth_nonces for SEP-10. Stores the issued nonce, the public key it was bound to, expiry, and consumed timestamp.

28. src/server/config/env.ts — Zod-validated environment. Throws at boot if anything is missing or wrong; the rest of the app imports env from here.

29. src/lib/wallet.tsx — React WalletProvider and useWallet. Owns the connect flow (requestAccess, challenge, sign, verify, cookie), exposes signXdr, and surfaces friendly errors when Freighter is missing.

30. src/lib/api.ts — typed fetch wrapper. Always unwraps the { ok, data } envelope, throws on failure with the server-supplied message.

31. src/lib/stellar-config.ts — client-side Stellar config. NETWORK_PASSPHRASE and the public pool contract id are exported so the wallet can pin to the testnet passphrase when signing.

32. src/lib/format.ts — stroopsToAmount, decToStroops, ticketsForStroops. UI math plus the source of truth for the stroops-per-unit constant.

33. src/lib/types.ts — shared TS types for round, deposit, and balance payloads.

34. contracts/suwerte-pool/src/lib.rs — the Soroban contract. See STELLAR INTEGRATION for entry points.

35. contracts/suwerte-pool/src/storage.rs — DataKey enum, instance vs persistent TTL bump helpers.

36. contracts/suwerte-pool/src/error.rs — Error enum, converted to Soroban contract errors.

37. contracts/suwerte-pool/src/test.rs — 12 tests including the no-loss invariant, weighted draw, pause behaviour, and snapshot tests.

38. contracts/scripts/deploy.sh — build, optimize, deploy, initialize the contract on testnet.

39. contracts/DEPLOYMENT.md — recorded contract id, tx hashes, and wasm hash from the last deploy.

40. tests/setup.ts — Vitest setup; loads @testing-library/jest-dom matchers and stubs window.matchMedia for jsdom.

41. tests/unit/service, tests/unit/stellar — Vitest unit suites.

42. tests/e2e — Playwright on-chain end-to-end suite. Hits the live Vercel deployment and signs with a Node keypair by emulating Freighter's postMessage bridge.


DATA MODEL

1. TABLE rounds
   Columns: id uuid primary key; roundNumber integer not null; status round_status enum (open, drawing, completed), default open; seedHash text not null (sha256 of serverSeed, published at round open); serverSeed text nullable (revealed at draw); winnerPublicKey text nullable; prizeStroops text nullable; drawTxHash text nullable; drawAt timestamp with timezone nullable; closesAt timestamp with timezone nullable; createdAt timestamp with timezone default now; updatedAt timestamp with timezone default now. Indexes on roundNumber and status. The serverSeed column is hidden from the client before draw time and revealed only inside executeDraw.

2. TABLE deposits
   Columns: id uuid primary key; roundId uuid not null, foreign key to rounds.id with onDelete cascade; publicKey text not null; asset deposit_asset enum (XLM, USDC), default XLM; amountStroops text not null (string-encoded BigInt to avoid float drift); tickets integer default 1; status deposit_status enum (confirmed, withdrawn), default confirmed; txHash text not null with a unique index (one txHash maps to one deposit); withdrawTxHash text nullable; withdrawnAt timestamp with timezone nullable; createdAt timestamp with timezone default now. Indexes on roundId, publicKey, and status.

3. TABLE sessions
   Columns: id uuid primary key (held in the suwerte_session cookie); publicKey text not null; createdAt timestamp with timezone default now; expiresAt timestamp with timezone not null. No password, no JWT — the row is the session.

4. TABLE auth_nonces
   Columns: nonce text primary key (the base64 nonce embedded in the SEP-10 manageData op); publicKey text not null; expiresAt timestamp with timezone not null; consumedAt timestamp with timezone nullable. Used once, then marked consumed.


STELLAR INTEGRATION

1. SOROBAN CONTRACT SUWERTE-POOL
   On-chain role: the only custodian of saver principal and the only place where a winner is chosen. Lives at CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I.

   1.1 initialize(admin: Address, token: Address) — admin auth required. One-time setup. Records admin and the escrow token (XLM SAC), zeroes the aggregates, unpauses.

   1.2 deposit(saver: Address, amount: i128) — saver auth required. Pulls amount of the escrow token from saver to the contract; credits the saver's principal; if the saver is new, appends them to the savers vector.

   1.3 withdraw(saver: Address, amount: i128) — saver auth required. Transfers amount of the escrow token from the contract to saver; debits the saver's principal; removes the saver from the savers vector if their balance hits zero. Never restricted by draws — that is the no-loss guarantee.

   1.4 fund_prize(funder: Address, amount: i128) — funder auth required. Transfers amount of the escrow token from the funder to the contract, separately from principal; bumps the prize pool.

   1.5 draw() — admin auth required. Picks a u64 with env.prng().gen_range, walks the cumulative principal vector to find a saver, transfers the entire prize pool to that saver, zeroes the prize pool, increments the draw count, and records lastWinner + lastPrize. Rejects when no savers, zero total principal, or zero prize.

   1.6 pause, unpause, set_admin(new_admin) — admin only. Gates deposit and draw.

   1.7 VIEWS: principal_of, total_principal, prize_pool, total_savers, savers, draw_count, last_winner, last_prize, is_paused, get_admin, get_token. Read by the server via simulateTransaction.

2. SEP-10 AUTH
   The server is its own auth server. /api/auth/challenge builds a transaction sourced by the treasury (sequence -1 so the built tx has sequence 0), carries a single manageData op sourced by the client whose value is a fresh 32-byte nonce, signs with the treasury key, and returns XDR. /api/auth/verify decodes the signed tx pinned to the network passphrase, finds the manageData op, decodes the nonce, looks it up in auth_nonces bound to the same public key, unexpired and unconsumed, and verifies the client signature against the tx hash. On success the nonce is consumed and a sessions row is created with the cookie set.

3. SOROBAN CONTRACT INVOCATIONS
   Saver flow: /api/deposits/build runs buildDepositInvoke in src/server/stellar/pool.ts — gets the saver's account from Soroban RPC, builds a contract call to deposit(saver, amount) with fee 2_000_000 stroops and a 180s timeout, runs prepareTransaction to simulate and attach the resource fee, returns prepared XDR. The wallet signs. /api/deposits accepts the signed XDR, runs parsePoolInvoke to confirm the tx really targets our contract with deposit(saver, amount) where saver equals the session public key, submits via sendTransaction, polls getTransaction for up to 30 seconds, and only then writes the deposits row. Withdraws follow the same shape against withdraw(saver, amount).

4. ADMIN-ONLY CONTRACT INVOCATIONS
   /api/round/draw runs executeDraw in src/server/service/round.service.ts. First it funds the prize via adminFundPrize (admin signs fund_prize(treasury, prizeStroops)) then runs adminDraw (admin signs draw() with no args). Both helpers load the treasury account, build the call, prepare, sign, submit, and poll. The DrawResult.winner is read from the successful invoke return value. On failure the round is rolled back to open and a 502 is returned.

5. NATIVE XLM VIA STELLAR ASSET CONTRACT
   The pool holds XLM through its SAC. There is no trustline and no classic payment for XLM — every XLM movement is the inner SAC transfer that the pool contract performs inside deposit, withdraw, fund_prize, and draw.

6. USDC VIA CLASSIC STELLAR PAYMENTS
   USDC is opt-in. /api/usdc/build returns an unsigned changeTrust for the testnet USDC issuer so a one-tap Enable USDC flow can submit it; USDC deposits are a classic payment to the treasury, recorded only after verifyDepositPayment confirms via Horizon that the tx succeeded with a matching payment op. USDC withdrawals do not require a signature — the treasury refunds with treasuryPay.

7. HORIZON READS
   account/balances calls Horizon loadAccount and walks balances for native + USDC. verifyDepositPayment calls transactions().transaction(hash) and operations().forTransaction(hash). All read paths are cacheable for short windows, none are cached across writes.

8. NETWORK PASSPHRASE PINNING
   Every build and verify call passes STELLAR_NETWORK_PASSPHRASE explicitly. The client passes NETWORK_PASSPHRASE to signTransaction so Freighter signs against testnet regardless of which network the wallet UI is currently showing.


KEY FLOWS

1. CONNECT WALLET
   1.1 User clicks Connect. WalletProvider.connect calls requestAccess via @stellar/freighter-api. On failure it surfaces a friendly "Freighter wallet not detected" error.
   1.2 The provider POSTs { publicKey } to /api/auth/challenge. The route validates the key with Zod and calls buildChallenge in src/server/lib/sep10.ts. That helper generates a 32-byte random nonce, builds a TransactionBuilder on a synthetic server account (sequence -1) with a single manageData op sourced by the client, signs with the treasury key, inserts the nonce into auth_nonces with a 5-minute TTL, and returns the XDR.
   1.3 The provider calls signTransaction on Freighter pinned to NETWORK_PASSPHRASE. The user approves in the wallet popup.
   1.4 The provider POSTs { publicKey, signedTransaction } to /api/auth/verify. verifyChallenge decodes the tx, finds the manageData op, decodes the nonce, looks up the matching unconsumed row for this public key with expiresAt greater than now, verifies a signature on the tx hash matches the public key, marks the nonce consumed, calls createSession to insert a sessions row and set the suwerte_session cookie, and returns ok.
   1.5 The provider stores publicKey in React state. /api/auth/me on next page load re-reads the cookie so refreshes keep the user connected.

2. DEPOSIT XLM (the product's core action)
   2.1 The play page POSTs { asset: XLM, amountStroops } to /api/deposits/build. The route requires a session, validates input, and calls buildDepositInvoke in pool.ts. The server loads the saver's account from Soroban RPC, builds a contract call to deposit(saver, amount) on the pool, runs prepareTransaction to simulate + attach the resource fee, and returns prepared XDR.
   2.2 The browser hands the XDR to WalletProvider.signXdr, which calls signTransaction pinned to the testnet passphrase. Freighter signs (the same auth covers the inner SAC transfer).
   2.3 The browser POSTs { roundId, asset, signedXdr } to /api/deposits. The service calls parsePoolInvoke to decode the signed tx and assert it targets our pool, calls deposit, the saver equals the session public key, and amount is positive. submitSignedSorobanXdr sends the tx and polls getTransaction until SUCCESS or FAILED.
   2.4 The service computes tickets via ticketsForStroops and inserts a deposits row with status confirmed, the real tx hash, and the parsed amount. A unique index on txHash prevents double recording.
   2.5 The play page re-fetches /api/round/current to refresh the principal and ticket count. Every action shows a tx hash that links to stellar.expert.

3. RUN THE DRAW
   3.1 An admin (or the seeded operator key) POSTs to /api/round/draw with the current round id. The service loads the round and rejects if status is not open. It refuses to draw when there are no savers or no escrowed XLM on chain (it queries getPoolStats for total_principal and prize_pool).
   3.2 The round row is moved to drawing. aggregateRound recomputes the XLM + USDC principal sums and the live prize = PRIZE_BASE_UNITS * 1 XLM + (principal * PRIZE_RATE_BPS / 10_000).
   3.3 adminFundPrize submits a server-signed fund_prize(treasury, prizeStroops) call. On failure the round is rolled back to open.
   3.4 adminDraw submits a server-signed draw() call with no args. The contract picks a u64 in [0, total_principal), walks the cumulative principal vector to find the winner, transfers the entire prize pool to them, zeroes the prize pool, and records lastWinner + lastPrize. The server reads the winner from the invoke return value.
   3.5 The round row is updated to completed with winnerPublicKey, prizeStroops, drawTxHash, and drawAt. ensureCurrentRound immediately opens the next weekly round with a fresh serverSeed and seedHash so the product is never stuck.
   3.6 The prize is the only money that moves on draw. Principal is escrowed in the contract and is untouched.

4. WITHDRAW XLM (the no-loss exit)
   4.1 The play page POSTs { depositId } to /api/deposits/withdraw/build. The service looks up the deposit, asserts it belongs to the session public key, asserts status is confirmed, asserts the round is open, and calls buildWithdrawInvoke to return a prepared withdraw(saver, amount) XDR where amount equals the recorded principal.
   4.2 The wallet signs. The browser POSTs { depositId, signedXdr } to /api/deposits/withdraw. The service parses the signed tx, asserts it is a withdraw call for the right saver and the right amount, submits, polls for SUCCESS, and updates the deposits row to withdrawn with withdrawTxHash and withdrawnAt.

5. STATS
   5.1 The landing and /stats pages call GET /api/stats. The route delegates to getStats in stats.service.ts.
   5.2 The service runs three SQL aggregates against sessions, deposits, and rounds. It returns uniqueWallets, logins, rounds, completedRounds, deposits, totalDepositedXlm (stroops), prizesPaidXlm (stroops), and winners. Any keys in STATS_EXCLUDE_KEYS are filtered out so demo or seed accounts do not skew the public numbers.
   5.3 The client renders the counts; empty states show 0 with a "nothing yet" hint instead of inventing data.


ENVIRONMENT VARIABLES

1. NODE_ENV — development | test | production. Controls cookie secure flag.

2. NEXT_PUBLIC_APP_NAME — display name. Defaults to Suwerte.

3. NEXT_PUBLIC_APP_URL — canonical app URL. Used by the client.

4. DRIZZLE_DATABASE_URL — Postgres connection string. Required.

5. STELLAR_NETWORK — testnet | public | futurenet. Switches the USDC issuer between testnet and public.

6. STELLAR_HORIZON_URL — Horizon base URL.

7. STELLAR_NETWORK_PASSPHRASE — pinned at every build and verify call.

8. SOROBAN_RPC_URL — Soroban RPC base URL.

9. SOROBAN_POOL_CONTRACT_ID — server-side pool contract id.

10. NEXT_PUBLIC_POOL_CONTRACT_ID — same id, exposed to the client for explorer links.

11. XLM_SAC_CONTRACT_ID — native XLM Stellar Asset Contract id.

12. USDC_ASSET_CODE — defaults to USDC.

13. USDC_ASSET_ISSUER_TESTNET — testnet USDC issuer.

14. USDC_ASSET_ISSUER_PUBLIC — public USDC issuer (used when STELLAR_NETWORK=public).

15. TREASURY_PUBLIC_KEY — pool admin, prize funder, SEP-10 server.

16. TREASURY_SECRET_KEY — signs fund_prize, draw, and SEP-10 challenges. Testnet only.

17. PRIZE_BASE_UNITS — base prize in XLM, default 2.

18. PRIZE_RATE_BPS — share of the round's principal added to the prize, default 500 (5 percent).

19. STATS_EXCLUDE_KEYS — comma-separated public keys to exclude from /api/stats.

20. SESSION_SECRET — reserved, must be at least 32 chars if set; session ids are random uuids, not signed tokens.

21. SESSION_COOKIE_NAME — cookie name, default suwerte_session.

22. SESSION_TTL_SECONDS — session lifetime, default 604800 (7 days).

23. HOME_DOMAIN — used as the manageData op name in SEP-10 challenges, default suwerte.vercel.app.


DEPLOY

1. VERCEL PROJECT
   Project name: suwerte. Project id: prj_y7MvU4211vduR6J7CezsianCI3Se. Scope (team): team_eqrxYAJNb8f2yCEjwHhAHaR6. Production URL: https://suwerte.vercel.app. Branch deploys run on every push; production is the main branch.

2. SUPABASE DATABASE
   Postgres instance provisioned on Supabase. DRIZZLE_DATABASE_URL is the only reference to it. Schema is pushed with pnpm run db:push, which runs drizzle-kit push --force against the same URL.

3. SOROBAN CONTRACT
   Built and deployed with contracts/scripts/deploy.sh on Stellar testnet. The deploy script pins the toolchain to rust 1.89.0, optimizes the WASM, deploys it, and runs initialize(admin, token) with the treasury public key as admin and the XLM SAC as the escrow token. Last-known ids are recorded in contracts/DEPLOYMENT.md.

4. STELLAR ENDPOINTS
   Horizon at https://horizon-testnet.stellar.org. Soroban RPC at https://soroban-testnet.stellar.org. The app reads STELLAR_HORIZON_URL and SOROBAN_RPC_URL from env so the same code can target a local stack if needed.


LIMITATIONS + KNOWN GAPS

1. TESTNET ONLY
   Soroban deployment, treasury key, USDC issuer, and Horizon/RPC endpoints all point at Stellar testnet. TREASURY_SECRET_KEY is a testnet key and must never be reused on public.

2. TREASURY IS A SINGLE KEY
   Prize funding and the draw both rely on one server-side keypair. There is no multisig or key-rotation flow. set_admin exists on the contract but is not yet wired into the API or a UI.

3. PRIZE IS HARDCODED TO A FIXED FORMULA
   Prize amount = PRIZE_BASE_UNITS XLM + (round_principal_XLM * PRIZE_RATE_BPS / 10_000). There is no dynamic prize from yield routing, no sponsor UI, and no support for topping up mid-round beyond what adminFundPrize can do directly.

4. USDC IS NOT CONTRACT-BACKED
   USDC is a classic Stellar payment to the treasury and a server-signed refund. It does not share the no-loss escrow of the Soroban pool — the no-loss guarantee applies to XLM through the contract. The UI labels USDC as opt-in to make this clear.

5. WITHDRAWALS ARE BLOCKED WHILE A ROUND IS DRAWING
   When status moves to drawing, withdraw rejects with 409. Reopens automatically when the next round opens. There is no queueing and no grace period.

6. SERVER SEED IS HELD IN THE DATABASE
   The seed is stored in rounds.serverSeed in plaintext from round open until draw. Anyone with database read access can see it ahead of time; the provably-fair commit only proves the server did not change it mid-round, not that it was secret before. A hardware-backed HSM or split-key ceremony would harden this.

7. NO PAGINATION
   /api/round/current and /api/deposits return everything for the current round and the connected wallet respectively. Fine for hackathon scale, not for production volume.

8. NO MULTI-LOCALE
   The app has no locale routing in src/app; there is an src/i18n directory and a messages directory present in the repo but the routes are not localized. UI strings are in English.

9. NO BACKGROUND TASKS
   The draw is run synchronously by an admin request. There is no cron, queue, or scheduled worker that closes a round at closesAt. closesAt is informational.

10. NO RATE LIMITING
    /api/auth/challenge and /api/deposits can be hit freely. There is no IP throttle, no per-wallet quota, no captcha.

11. AUTH NONCES HAVE A GENEROUS TTL
    5 minutes. Sufficient for the demo; tighter TTLs plus nonce rotation per attempt would be safer.

12. CONTRACT EVENTS ARE NOT INDEXED
    The contract emits deposit, withdraw, fund, draw events but the app only reads via simulateTransaction on demand. No persistent event log is built from the chain.

13. NO TELEMETRY OR ALERTING
    No Sentry, no log drain, no on-call pager. Errors are returned to the client and printed to the server log.

14. VERIFY DOES NOT REQUIRE HOME DOMAIN SIGNATURE
    The SEP-10 challenge is built with manageData only; there is no web auth domain signature or additional client-domain verification. Adequate for a wallet-attached flow, not a full SEP-10 anchor.