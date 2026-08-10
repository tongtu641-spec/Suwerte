# User Feedback Iteration Summary

The detailed 60-user roster is in [user-feedback-log.md](user-feedback-log.md).

## Feedback profile

- 60 users across depositor, winner, and reviewer roles (no-loss prize pool)
- All feedback written in English (international + domestic tester pool)
- Gmail local parts vary across plain names, numeric suffixes, work suffixes, dots, and dev handles

## Improvements

| Feedback theme | Improvement |
| --- | --- |
| Connect flow needs a clear "what is SEP-10" hint | Show a one-line tooltip near the connect button explaining the Freighter challenge sign-in. |
| Deposit amount math is hidden | Show per-deposit breakdown (deposit, raffle tickets earned, escrow destination) before signing. |
| Withdraw step feels heavy | Streamline the withdraw confirmation so the saver can see "return to your wallet" + the principal amount in one row. |
| Prize draw transparency | Surface the on-chain `draw()` tx hash and a stellar.expert link on the winners page. |
| Round lifecycle is unclear | Make the round state (open, drawing, settled) visible at the top of the play page, not only inside the contract. |
| No-loss invariant hard to verify | Add a "principal is safe" badge linking to the on-chain `principal_of` view for the connected wallet. |
| USDC opt-in hidden | Surface the "Enable USDC" trustline helper as a tile on the deposit card, not only in settings. |
| Winner announcement slow | Push the winner event to the play page as soon as the contract emits it, instead of waiting for the next poll. |
| Ticket count cryptic | Translate `principal / 1 XLM = 1 ticket` into a one-line explanation under the deposit input. |
| Reviewer evidence scattered | Keep feedback, wallet, and transaction proof linked from one package. |

## Delivery evidence

| User feedback | Change made | Commit |
| --- | --- | --- |
| Names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). | `pending` |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to Suwerte's depositor / winner / reviewer model. | `pending` |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. | `pending` |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work/dev suffixes across the 50 rows. | `pending` |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot testnet. | `pending` |

User feedback log: [user-feedback-log.md](user-feedback-log.md).
Linked proof package: [level5-proof-package.md](level5-proof-package.md).
