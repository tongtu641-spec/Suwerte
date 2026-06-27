# Suwerte Pool — Deployment Record

## Testnet (live)
Contract ID:      CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I
Wasm hash:        47834559c034adc3c7ce8c8f1c1e27115fbeaa36a5081f45e353472455c8430b
Admin (deployer): GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47
Pool token (SAC): CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC  (native XLM)
Network passphrase: Test SDF Network ; September 2015
RPC:              https://soroban-testnet.stellar.org
Deploy tx:        e6387a035e62ebfd3373d92671de11d895b061746d48fe194e35fb810006ce73
Initialize tx:    6a6ef2f9b61192eaeec09308a28e731078f7ceb33017d05d297dd74e3ec2d27c
Explorer:         https://stellar.expert/explorer/testnet/contract/CCYTFSNCHA5KY5EAPF63627JI33AQ4VOUDS36EDEP32IEOJ2LI7YEN4I

## Build
Toolchain:  Rust 1.89.0, target wasm32-unknown-unknown
SDK:        soroban-sdk 22.0.0
CLI:        stellar 27.0.0
Steps:
  cargo +1.89.0 test                                            # 12 tests pass
  cargo +1.89.0 build --target wasm32-unknown-unknown --release
  stellar contract optimize --wasm target/.../suwerte_pool.wasm # -> 16.2 KB
  stellar contract deploy --wasm <optimized> --source deployer --network testnet
  stellar contract invoke --id <id> --source deployer --network testnet -- \
    initialize --admin <ADMIN> --token <XLM_SAC>

## Mainnet
Contract ID: (not deployed)
Network passphrase: Public Global Stellar Network ; September 2015
RPC: https://soroban.stellar.org
Switch: set STELLAR_NETWORK=public in .env.local and redeploy with --network public.
