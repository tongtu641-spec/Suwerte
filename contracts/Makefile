.PHONY: test build optimize lint clean

test:
	cargo test

build:
	cargo build --target wasm32-unknown-unknown --release

optimize:
	stellar contract optimize --wasm target/wasm32-unknown-unknown/release/suwerte_pool.wasm

lint:
	cargo clippy -- -D warnings

clean:
	cargo clean
