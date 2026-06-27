#![cfg(test)]

use crate::error::Error;
use crate::{SuwertePool, SuwertePoolClient};

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, Env};

struct Setup<'a> {
    env: Env,
    client: SuwertePoolClient<'a>,
    token_client: TokenClient<'a>,
    sac_admin: StellarAssetClient<'a>,
    admin: Address,
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

    // Stand-in for the native XLM Stellar Asset Contract.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();

    let contract_id = env.register(SuwertePool, ());
    let client = SuwertePoolClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    Setup {
        token_client: TokenClient::new(&env, &token),
        sac_admin: StellarAssetClient::new(&env, &token),
        env,
        client,
        admin,
    }
}

fn funded_saver(s: &Setup, amount: i128) -> Address {
    let a = Address::generate(&s.env);
    s.sac_admin.mint(&a, &amount);
    a
}

#[test]
fn test_initialize() {
    let s = setup();
    assert_eq!(s.client.get_admin(), s.admin);
    assert_eq!(s.client.total_principal(), 0);
    assert_eq!(s.client.prize_pool(), 0);
    assert_eq!(s.client.total_savers(), 0);
    assert_eq!(s.client.draw_count(), 0);
}

#[test]
fn cannot_initialize_twice() {
    let s = setup();
    let other = Address::generate(&s.env);
    let res = s.client.try_initialize(&other, &s.token_client.address);
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn deposit_tracks_principal_and_escrows_funds() {
    let s = setup();
    let saver = funded_saver(&s, 1_000);

    let principal = s.client.deposit(&saver, &600);
    assert_eq!(principal, 600);
    assert_eq!(s.client.principal_of(&saver), 600);
    assert_eq!(s.client.total_principal(), 600);
    assert_eq!(s.client.total_savers(), 1);
    // Saver debited, contract holds the escrow.
    assert_eq!(s.token_client.balance(&saver), 400);
    assert_eq!(s.token_client.balance(&s.client.address), 600);
}

#[test]
fn withdraw_returns_principal_no_loss() {
    let s = setup();
    let saver = funded_saver(&s, 1_000);
    s.client.deposit(&saver, &1_000);

    // Full principal is always reclaimable.
    let remaining = s.client.withdraw(&saver, &400);
    assert_eq!(remaining, 600);
    assert_eq!(s.token_client.balance(&saver), 400);

    let remaining = s.client.withdraw(&saver, &600);
    assert_eq!(remaining, 0);
    assert_eq!(s.token_client.balance(&saver), 1_000); // got every unit back
    assert_eq!(s.client.total_savers(), 0); // dropped from index at zero
    assert_eq!(s.client.total_principal(), 0);
}

#[test]
fn withdraw_more_than_principal_is_rejected() {
    let s = setup();
    let saver = funded_saver(&s, 1_000);
    s.client.deposit(&saver, &500);

    let res = s.client.try_withdraw(&saver, &501);
    assert_eq!(res, Err(Ok(Error::InsufficientPrincipal)));
    // Principal intact after the rejected withdraw.
    assert_eq!(s.client.principal_of(&saver), 500);
}

#[test]
fn deposit_zero_or_negative_is_rejected() {
    let s = setup();
    let saver = funded_saver(&s, 1_000);
    assert_eq!(s.client.try_deposit(&saver, &0), Err(Ok(Error::InvalidAmount)));
    assert_eq!(s.client.try_deposit(&saver, &-5), Err(Ok(Error::InvalidAmount)));
}

#[test]
fn fund_prize_increases_pool() {
    let s = setup();
    let sponsor = funded_saver(&s, 500);
    let pool = s.client.fund_prize(&sponsor, &500);
    assert_eq!(pool, 500);
    assert_eq!(s.client.prize_pool(), 500);
}

#[test]
fn draw_pays_prize_to_a_saver_and_leaves_principal_intact() {
    let s = setup();
    let a = funded_saver(&s, 1_000);
    let b = funded_saver(&s, 1_000);
    s.client.deposit(&a, &1_000);
    s.client.deposit(&b, &1_000);

    let sponsor = funded_saver(&s, 300);
    s.client.fund_prize(&sponsor, &300);

    let total_principal_before = s.client.total_principal();
    let winner = s.client.draw();

    // Winner is one of the two savers.
    assert!(winner == a || winner == b);
    // Prize pool emptied; principal totally untouched (no loss).
    assert_eq!(s.client.prize_pool(), 0);
    assert_eq!(s.client.total_principal(), total_principal_before);
    assert_eq!(s.client.principal_of(&a), 1_000);
    assert_eq!(s.client.principal_of(&b), 1_000);
    assert_eq!(s.client.draw_count(), 1);
    assert_eq!(s.client.last_winner(), Some(winner.clone()));
    assert_eq!(s.client.last_prize(), 300);

    // The winner received exactly the prize on top of nothing else; both savers
    // can still withdraw their full principal afterwards.
    assert_eq!(s.client.withdraw(&a, &1_000), 0);
    assert_eq!(s.client.withdraw(&b, &1_000), 0);
    assert_eq!(s.token_client.balance(&a), if winner == a { 1_300 } else { 1_000 });
    assert_eq!(s.token_client.balance(&b), if winner == b { 1_300 } else { 1_000 });
}

#[test]
fn draw_without_savers_is_rejected() {
    let s = setup();
    let sponsor = funded_saver(&s, 100);
    s.client.fund_prize(&sponsor, &100);
    assert_eq!(s.client.try_draw(), Err(Ok(Error::NoSavers)));
}

#[test]
fn draw_without_prize_is_rejected() {
    let s = setup();
    let a = funded_saver(&s, 1_000);
    s.client.deposit(&a, &1_000);
    assert_eq!(s.client.try_draw(), Err(Ok(Error::NoPrize)));
}

#[test]
fn pause_blocks_deposit_and_draw() {
    let s = setup();
    let a = funded_saver(&s, 1_000);
    s.client.deposit(&a, &1_000);
    let sponsor = funded_saver(&s, 100);
    s.client.fund_prize(&sponsor, &100);

    s.client.pause();
    assert!(s.client.is_paused());
    assert_eq!(s.client.try_deposit(&a, &10), Err(Ok(Error::Paused)));
    assert_eq!(s.client.try_draw(), Err(Ok(Error::Paused)));
    // Withdraw still works while paused — no-loss must never be blocked.
    assert_eq!(s.client.withdraw(&a, &1_000), 0);

    s.client.unpause();
    assert!(!s.client.is_paused());
}

#[test]
fn weighted_draw_favours_larger_principal() {
    // Statistical sanity: with a 99:1 principal split the big saver should win
    // the vast majority of many draws. Uses the deterministic test PRNG.
    let s = setup();
    let big = funded_saver(&s, 1_000_000);
    let small = funded_saver(&s, 1_000_000);
    s.client.deposit(&big, &9_900);
    s.client.deposit(&small, &100);

    let mut big_wins = 0;
    let rounds = 50;
    for _ in 0..rounds {
        let sponsor = funded_saver(&s, 10);
        s.client.fund_prize(&sponsor, &10);
        if s.client.draw() == big {
            big_wins += 1;
        }
    }
    assert!(big_wins > rounds / 2, "weighted draw should favour the larger principal");
}
