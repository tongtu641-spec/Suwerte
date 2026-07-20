'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Coins, Trophy, Users, Wallet, Ticket, Repeat } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import type { Stats } from '@/lib/types';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiGet<Stats>('/api/stats')
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <span className="chip text-gold">
        <Activity className="h-3.5 w-3.5" /> Live · from on-chain activity
      </span>
      <h1 className="mt-4 text-3xl sm:text-4xl">Suwerte by the numbers</h1>
      <p className="mt-2 max-w-xl text-muted">
        Real interaction counts measured from wallet sessions and on-chain deposits. No seed data —
        every number below comes from a real wallet completing a real flow.
      </p>

      {error && (
        <div className="card mt-8 p-6 text-coral">Couldn&apos;t load stats. Please retry shortly.</div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Unique wallets" value={stats?.uniqueWallets} loading={loading} />
        <StatCard icon={Repeat} label="Wallet logins" value={stats?.logins} loading={loading} />
        <StatCard icon={Coins} label="Deposits made" value={stats?.deposits} loading={loading} />
        <StatCard icon={Ticket} label="Rounds opened" value={stats?.rounds} loading={loading} />
        <StatCard
          icon={Coins}
          label="XLM pooled (all time)"
          value={stats ? formatAmount(stats.totalDepositedXlm) : undefined}
          loading={loading}
        />
        <StatCard
          icon={Trophy}
          label="XLM paid in prizes"
          value={stats ? formatAmount(stats.prizesPaidXlm) : undefined}
          loading={loading}
        />
        <StatCard icon={Trophy} label="Rounds drawn" value={stats?.completedRounds} loading={loading} />
        <StatCard icon={Users} label="Distinct winners" value={stats?.winners} loading={loading} />
      </div>

      <div className="card mt-8 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          Numbers move when real wallets connect and deposit. Want to add to them?
        </p>
        <Link href="/play" className="btn btn-gold">
          Enter this round <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string | undefined;
  loading: boolean;
}) {
  return (
    <div className="card p-5">
      <Icon className="h-5 w-5 text-gold" />
      {loading ? (
        <div className="skeleton mt-4 h-8 w-16" />
      ) : (
        <p className="mt-4 text-3xl font-semibold text-ink-text">{value ?? 0}</p>
      )}
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
