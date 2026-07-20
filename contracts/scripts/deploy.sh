#!/usr/bin/env bash
#
# Build, deploy and initialize the Suwerte no-loss prize-pool contract.
#
# Prereqs:
#   - Rust 1.89.0 + wasm32-unknown-unknown   (rustup target add wasm32-unknown-unknown)
#   - Stellar CLI >= 27                       (cargo install --locked stellar-cli)
#   - A funded signing identity named "deployer" (testnet auto-funds via friendbot)
#
# Usage:
#   ./scripts/deploy.sh                    # testnet
#   NETWORK=public ./scripts/deploy.sh     # mainnet (identity must be funded)
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-deployer}"
WASM="target/wasm32-unknown-unknown/release/suwerte_pool.optimized.wasm"

cd "$(dirname "$0")/.."

# Native XLM Stellar Asset Contract id per network.
if [ "$NETWORK" = "testnet" ]; then
  XLM_SAC="${XLM_SAC:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
else
  XLM_SAC="${XLM_SAC:-CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA}"
fi

ADMIN_ADDR="$(stellar keys address "$IDENTITY")"
echo "Network: $NETWORK   Admin: $ADMIN_ADDR   Token: $XLM_SAC"

echo "Building optimized wasm..."
cargo +1.89.0 build --target wasm32-unknown-unknown --release
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/suwerte_pool.wasm

echo "Deploying..."
CONTRACT_ID=$(stellar contract deploy --wasm "$WASM" --source "$IDENTITY" --network "$NETWORK")
echo "Contract id: $CONTRACT_ID"

echo "Initializing..."
stellar contract invoke --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
  -- initialize --admin "$ADMIN_ADDR" --token "$XLM_SAC"

echo ""
echo "Done. Add to .env.local / Vercel:"
echo "   SOROBAN_POOL_CONTRACT_ID=$CONTRACT_ID"
echo "   NEXT_PUBLIC_POOL_CONTRACT_ID=$CONTRACT_ID"
echo "   XLM_SAC_CONTRACT_ID=$XLM_SAC"
echo "   SOROBAN_RPC_URL=https://soroban-${NETWORK}.stellar.org"
