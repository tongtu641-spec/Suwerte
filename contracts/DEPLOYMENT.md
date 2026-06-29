# Suwerte Pool — Deployment Record

## Mainnet (live)
Contract ID:      CCHM7Q7YSTQ4KCHKQS7HJKI5ZZWEPGQRLE4YSVCVZ3DYCTNHXPZ5KFFJ
Wasm hash:        e72dca18bdeb7fd4e5980fcc679bf857fbcd2e0d2894676c564b6a81e2a28df8
Admin (deployer): GCWH7ZC2YVCEHVRTZUYC6BPWQLWFYG3OWR3G3IRAX5DVFVZMUK7MYHM5
Pool token (SAC): CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA  (native XLM)
Network passphrase: Public Global Stellar Network ; September 2015
RPC:              https://mainnet.sorobanrpc.com
Deploy tx:        a708657d8a015c09434d79366958baa9766226187c6d9172e1094a8b55539fd5
Create-contract tx: 94e1aaac3d5ade500af4c2418f1a06e75ae35b34a20fd98451d32446383207b4
Initialize tx:    e6ccb20c22734b42ee542608272c11b0de0a1be13c1165e11e300684f52d25dc
Explorer:         https://stellar.expert/explorer/public/contract/CCHM7Q7YSTQ4KCHKQS7HJKI5ZZWEPGQRLE4YSVCVZ3DYCTNHXPZ5KFFJ

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
  stellar contract deploy --wasm <optimized> --source deployer --network mainnet --rpc-url https://mainnet.sorobanrpc.com --network-passphrase "Public Global Stellar Network ; September 2015"
  stellar contract invoke --id <id> --source deployer --network mainnet --rpc-url https://mainnet.sorobanrpc.com --network-passphrase "..." -- \
    initialize --admin <ADMIN> --token <XLM_SAC>
