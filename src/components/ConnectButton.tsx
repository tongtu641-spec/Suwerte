'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Wallet } from 'lucide-react';
import { useWallet } from '@/lib/wallet';
import { shortKey } from '@/lib/format';

export function ConnectButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { publicKey, connect, disconnect, connecting, ready } = useWallet();
  const [open, setOpen] = useState(false);

  async function handleConnect() {
    try {
      await connect();
      toast.success('Wallet connected');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not connect');
    }
  }

  if (!ready) {
    return <div className="skeleton h-10 w-32" />;
  }

  if (publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="chip cursor-pointer hover:border-gold"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="h-2 w-2 rounded-full bg-mint" />
          <span className="font-mono text-ink-text">{shortKey(publicKey)}</span>
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-44 card p-1.5">
            <button
              onClick={async () => {
                setOpen(false);
                await disconnect();
                toast('Disconnected');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ink-text"
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className={`btn btn-gold ${size === 'lg' ? 'text-base px-6 py-3' : 'text-sm'}`}
    >
      <Wallet className="h-4 w-4" />
      {connecting ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
}
