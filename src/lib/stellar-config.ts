// Client-side network config. The signing passphrase is PINNED to the app's
// configured network, never the wallet's active network.
export const APP_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

export const NETWORK_PASSPHRASE =
  APP_NETWORK === 'public'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

export const NETWORK_LABEL = APP_NETWORK === 'public' ? 'Mainnet' : 'Testnet';
