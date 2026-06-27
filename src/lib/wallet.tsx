'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  requestAccess,
  signTransaction,
  getAddress,
} from '@stellar/freighter-api';
import { apiGet, apiPost } from '@/lib/api';
import { NETWORK_PASSPHRASE } from '@/lib/stellar-config';

interface WalletState {
  publicKey: string | null;
  connecting: boolean;
  ready: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signXdr: (xdr: string) => Promise<string>;
  error: string | null;
}

const WalletContext = createContext<WalletState | null>(null);

async function freighterAddress(): Promise<string> {
  const access = await requestAccess();
  if (access.error) throw new Error(access.error);
  if (access.address) return access.address;
  const got = await getAddress();
  if (got.error) throw new Error(got.error);
  if (!got.address) throw new Error('No wallet address available');
  return got.address;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ publicKey: string | null }>('/api/auth/me')
      .then((d) => setPublicKey(d.publicKey))
      .catch(() => setPublicKey(null))
      .finally(() => setReady(true));
  }, []);

  const signXdr = useCallback(
    async (xdr: string): Promise<string> => {
      const address = publicKey ?? (await freighterAddress());
      const signed = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });
      if (signed.error) throw new Error(String(signed.error));
      return signed.signedTxXdr;
    },
    [publicKey],
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const address = await freighterAddress();
      const { transaction } = await apiPost<{ transaction: string }>('/api/auth/challenge', {
        publicKey: address,
      });
      const signed = await signTransaction(transaction, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });
      if (signed.error) throw new Error(String(signed.error));
      await apiPost('/api/auth/verify', {
        publicKey: address,
        signedTransaction: signed.signedTxXdr,
      });
      setPublicKey(address);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect wallet';
      setError(
        /freighter|not.*found|undefined/i.test(msg)
          ? 'Freighter wallet not detected. Install the Freighter extension to connect.'
          : msg,
      );
      throw e;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await apiPost('/api/auth/logout').catch(() => {});
    setPublicKey(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ publicKey, connecting, ready, connect, disconnect, signXdr, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
