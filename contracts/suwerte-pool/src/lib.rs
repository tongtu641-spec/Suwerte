#![no_std]
//! # Suwerte Pool — No-Loss Prize Savings
//!
//! A Soroban smart contract that runs a **no-loss prize-linked savings pool** on
//! Stellar. Savers deposit a token (native XLM via its Stellar Asset Contract);
//! their **principal is tracked per-saver and is always fully withdrawable** — the
//! pool can never take a saver's money. Separately, the admin (or a yield source)
//! funds a **prize**, and a `draw` picks ONE winner — weighted by principal — who
//! receives the whole prize. Everyone else keeps every unit of their principal.
//!
//! ## Why on-chain
//! The "no-loss" promise is the product. Putting deposits, withdrawals and the
//! draw in a contract makes that promise *verifiable*: the code never moves
//! principal into the prize, and `withdraw` always returns exactly what the saver
//! put in. No backend custody, no trust in an operator.
//!
//! ## Entry points
//! - `initialize(admin, token)` — one-time setup.
//! - `deposit(saver, amount)` — pull `amount` of `token` into the pool; credit principal.
//! - `withdraw(saver, amount)` — return principal to the saver (no loss, anytime).
//! - `fund_prize(funder, amount)` — top up the prize the next draw pays out.
//! - `draw()` — admin-only; pick a principal-weighted winner, pay them the prize.
//!
//! Auth: `require_auth` on the acting saver/funder; `draw` requires the admin.
//! The prize is paid from the contract's own balance; principal is escrowed and
//! is *never* touched by a draw.

mod error;
mod storage;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, INSTANCE_BUMP_AMOUNT, INSTANCE_LIFETIME_THRESHOLD, PRINCIPAL_BUMP_AMOUNT,
    PRINCIPAL_LIFETIME_THRESHOLD,
};

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Vec};

#[contract]
pub struct SuwertePool;

#[contractimpl]
impl SuwertePool {
    /// One-time setup. Records the admin and the escrow token (a SAC address,
    /// e.g. the native XLM contract), zeroes the aggregates, unpauses.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::TotalPrincipal, &0i128);
        env.storage().instance().set(&DataKey::PrizePool, &0i128);
        env.storage().instance().set(&DataKey::DrawCount, &0u32);
        env.storage()
            .instance()
            .set(&DataKey::Savers, &Vec::<Address>::new(&env));
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), (admin, token));
        Ok(())
    }

    /// Deposit `amount` of the pool token. The same authorization that the saver
    /// gives covers the inner SAC `transfer(saver -> contract)`.
    ///
    /// Returns the saver's new total principal.
    pub fn deposit(env: Env, saver: Address, amount: i128) -> Result<i128, Error> {
        saver.require_auth();
        require_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token = get_token(&env)?;
        token::Client::new(&env, &token).transfer(
            &saver,
            &env.current_contract_address(),
            &amount,
        );

        let prev = principal_of(&env, &saver);
        if prev == 0 {
            add_saver(&env, &saver);
        }
        let new_principal = prev + amount;
        set_principal(&env, &saver, new_principal);

        let total = total_principal(&env) + amount;
        env.storage().instance().set(&DataKey::TotalPrincipal, &total);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("deposit"), saver), (amount, new_principal));
        Ok(new_principal)
    }

    /// Withdraw `amount` of principal back to the saver. Always available — this
    /// is the no-loss guarantee: a saver can reclaim up to their full principal
    /// at any time, regardless of draws. A draw never reduces principal.
    ///
    /// Returns the saver's remaining principal.
    pub fn withdraw(env: Env, saver: Address, amount: i128) -> Result<i128, Error> {
        saver.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let prev = principal_of(&env, &saver);
        if amount > prev {
            return Err(Error::InsufficientPrincipal);
        }

        let token = get_token(&env)?;
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &saver,
            &amount,
        );

        let remaining = prev - amount;
        set_principal(&env, &saver, remaining);
        if remaining == 0 {
            remove_saver(&env, &saver);
        }

        let total = total_principal(&env) - amount;
        env.storage().instance().set(&DataKey::TotalPrincipal, &total);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("withdraw"), saver), (amount, remaining));
        Ok(remaining)
    }

    /// Add `amount` of the token to the prize the next draw pays out. Anyone may
    /// fund the prize (the admin, a sponsor, or a yield-routing account); the
    /// funder authorizes the inner transfer into the contract.
    ///
    /// Returns the new prize-pool balance.
    pub fn fund_prize(env: Env, funder: Address, amount: i128) -> Result<i128, Error> {
        funder.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token = get_token(&env)?;
        token::Client::new(&env, &token).transfer(
            &funder,
            &env.current_contract_address(),
            &amount,
        );

        let pool = prize_pool(&env) + amount;
        env.storage().instance().set(&DataKey::PrizePool, &pool);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("fund"), funder), (amount, pool));
        Ok(pool)
    }

    /// Admin-only draw. Picks ONE winner, weighted by principal, using the
    /// on-chain PRNG, and transfers the entire prize pool to them. Principal is
    /// untouched — only the prize moves. Returns the winning address.
    pub fn draw(env: Env) -> Result<Address, Error> {
        admin(&env)?.require_auth();
        require_not_paused(&env)?;

        let savers = get_savers(&env);
        if savers.is_empty() {
            return Err(Error::NoSavers);
        }
        let total = total_principal(&env);
        if total <= 0 {
            return Err(Error::NoSavers);
        }
        let prize = prize_pool(&env);
        if prize <= 0 {
            return Err(Error::NoPrize);
        }

        // Weighted draw: a ticket per unit of principal. Pick a target in
        // [0, total) and walk the cumulative principal to find its owner.
        let draw: u64 = env.prng().gen_range(0..=(total as u64 - 1));
        let target: i128 = draw as i128;
        let mut cumulative: i128 = 0;
        let mut winner = savers.get(0).unwrap();
        for s in savers.iter() {
            cumulative += principal_of(&env, &s);
            if target < cumulative {
                winner = s;
                break;
            }
        }

        let token = get_token(&env)?;
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &winner,
            &prize,
        );

        env.storage().instance().set(&DataKey::PrizePool, &0i128);
        let count = draw_count(&env) + 1;
        env.storage().instance().set(&DataKey::DrawCount, &count);
        env.storage()
            .instance()
            .set(&DataKey::LastWinner, &winner);
        env.storage().instance().set(&DataKey::LastPrize, &prize);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("draw"), count), (winner.clone(), prize));
        Ok(winner)
    }

    // --- Views -------------------------------------------------------------

    pub fn principal_of(env: Env, saver: Address) -> i128 {
        principal_of(&env, &saver)
    }

    pub fn total_principal(env: Env) -> i128 {
        total_principal(&env)
    }

    pub fn prize_pool(env: Env) -> i128 {
        prize_pool(&env)
    }

    pub fn total_savers(env: Env) -> u32 {
        get_savers(&env).len()
    }

    pub fn savers(env: Env) -> Vec<Address> {
        get_savers(&env)
    }

    pub fn draw_count(env: Env) -> u32 {
        draw_count(&env)
    }

    pub fn last_winner(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::LastWinner)
    }

    pub fn last_prize(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::LastPrize).unwrap_or(0)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        admin(&env)
    }

    pub fn get_token(env: Env) -> Result<Address, Error> {
        get_token(&env)
    }

    // --- Admin -------------------------------------------------------------

    pub fn pause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        bump_instance(&env);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        bump_instance(&env);
        Ok(())
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn get_token(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .ok_or(Error::NotInitialized)?;
    if paused {
        return Err(Error::Paused);
    }
    Ok(())
}

fn total_principal(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalPrincipal)
        .unwrap_or(0)
}

fn prize_pool(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::PrizePool)
        .unwrap_or(0)
}

fn draw_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::DrawCount)
        .unwrap_or(0)
}

fn principal_of(env: &Env, saver: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Principal(saver.clone()))
        .unwrap_or(0)
}

fn set_principal(env: &Env, saver: &Address, amount: i128) {
    let key = DataKey::Principal(saver.clone());
    if amount == 0 {
        env.storage().persistent().remove(&key);
        return;
    }
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, PRINCIPAL_LIFETIME_THRESHOLD, PRINCIPAL_BUMP_AMOUNT);
}

fn get_savers(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::Savers)
        .unwrap_or_else(|| Vec::new(env))
}

fn add_saver(env: &Env, saver: &Address) {
    let mut savers = get_savers(env);
    savers.push_back(saver.clone());
    env.storage().instance().set(&DataKey::Savers, &savers);
}

fn remove_saver(env: &Env, saver: &Address) {
    let savers = get_savers(env);
    let mut next = Vec::new(env);
    for s in savers.iter() {
        if s != *saver {
            next.push_back(s);
        }
    }
    env.storage().instance().set(&DataKey::Savers, &next);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
