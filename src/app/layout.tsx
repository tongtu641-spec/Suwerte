import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: 'Suwerte — No-Loss Prize Savings on Stellar',
  description:
    'Pool XLM together, win the weekly prize, keep your principal. A provably-fair, no-loss prize-savings game on Stellar.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'),
  openGraph: {
    title: 'Suwerte — No-Loss Prize Savings on Stellar',
    description: 'Save together. Nobody loses. Someone wins the weekly prize.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: {
                background: '#16183a',
                border: '1px solid #2b2f5e',
                color: '#ecedf7',
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
