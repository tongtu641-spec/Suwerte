use soroban_sdk::contracterror;

/// Explicit, contiguous `u32` error codes so the TypeScript client can map each
/// failure mode to a precise user-facing message.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientPrincipal = 4,
    NoSavers = 5,
    NoPrize = 6,
    Paused = 7,
}
