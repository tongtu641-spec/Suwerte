import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// jsdom doesn't expose Node's webcrypto on globalThis
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
}

// Provide required env vars for tests
process.env.DRIZZLE_DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.SESSION_SECRET ??= 'test-session-secret-at-least-32-characters-long';
process.env.STELLAR_NETWORK ??= 'testnet';
process.env.STELLAR_HORIZON_URL ??= 'https://horizon-testnet.stellar.org';
process.env.STELLAR_NETWORK_PASSPHRASE ??= 'Test SDF Network ; September 2015';

// jsdom matchMedia stub
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      const listeners = new Set<(e: MediaQueryListEvent) => void>();
      const mql: MediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (event: string, cb: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') listeners.add(cb);
        },
        removeEventListener: (event: string, cb: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') listeners.delete(cb);
        },
        addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
        removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
        dispatchEvent: () => true,
      };
      return mql;
    },
  });
}
