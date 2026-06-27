use soroban_sdk::{contracttype, Address};

/// Storage keys.
///
/// `Principal(saver)` lives in *persistent* storage — a saver's deposit must
/// outlive the contract instance's TTL window (their money is never lost).
/// Everything else (admin/token/aggregates/saver index) lives in *instance*
/// storage so it shares the instance TTL bumped on every state-changing call.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Paused,
    /// Sum of every saver's withdrawable principal (escrowed, never raffled).
    TotalPrincipal,
    /// Admin/yield-funded prize that the next draw pays to the winner.
    PrizePool,
    /// Ordered index of addresses that currently hold a positive principal.
    Savers,
    /// Number of completed draws.
    DrawCount,
    /// Most recent winner (for views / UI).
    LastWinner,
    /// Prize paid in the most recent draw.
    LastPrize,
    /// saver -> withdrawable principal (minor units / stroops).
    Principal(Address),
}

// Soroban ledgers close ~every 5s -> 17,280 ledgers/day.
pub const DAY_IN_LEDGERS: u32 = 17_280;

// Keep the instance (admin/config/aggregates) alive ~30 days, re-bumped on
// every state-changing call.
pub const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Saver principal is bumped to ~90 days so funds can never be stranded by entry
// expiry before the saver withdraws.
pub const PRINCIPAL_BUMP_AMOUNT: u32 = 90 * DAY_IN_LEDGERS;
pub const PRINCIPAL_LIFETIME_THRESHOLD: u32 = PRINCIPAL_BUMP_AMOUNT - DAY_IN_LEDGERS;
