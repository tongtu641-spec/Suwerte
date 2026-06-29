import path from 'node:path';
import { type BrowserContext, type Page, chromium, expect, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  getExtensionId,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://suwerte.vercel.app';
const SHOTS = path.join(__dirname, '..', '..', '..', 'screen-shot');
const shot = (n: string) => path.join(SHOTS, n);

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await onboardFreighter(context);
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

const APPROVAL_ROUTES = ['grant-access', 'sign-transaction', 'sign-auth-entry', 'sign-message'];

async function waitForApprovalPopup(ctx: BrowserContext): Promise<Page> {
  const prefix = `chrome-extension://${getExtensionId(ctx)}`;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const popup = ctx
      .pages()
      .find(
        (p) =>
          !p.isClosed() &&
          p.url().startsWith(prefix) &&
          APPROVAL_ROUTES.some((route) => p.url().includes(route)),
      );
    if (popup) return popup;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Freighter approval popup did not appear');
}

async function screenshotPopup(ctx: BrowserContext, file: string): Promise<void> {
  const popup = await waitForApprovalPopup(ctx);
  await popup.waitForTimeout(1200);
  await popup.screenshot({ path: file, type: 'jpeg', quality: 85 }).catch(() => {});
}

async function captureDepositTx(page: Page): Promise<{ txHash?: string }> {
  const holder: { txHash?: string } = {};
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/deposits')) return;
    if (res.request().method() !== 'POST') return;
    try {
      const body = await res.json();
      // biome-ignore lint/suspicious/noConsole: surface deposit api result for the report
      console.log(`DEPOSIT_RESP ${res.status()} ${url} ${JSON.stringify(body)}`);
      if (body?.ok && body.data?.txHash) holder.txHash = body.data.txHash;
    } catch {
      /* ignore */
    }
  });
  return holder;
}

async function connectWallet(ctx: BrowserContext, page: Page): Promise<void> {
  const connectBtn = page.getByRole('button', { name: /Connect wallet/i }).first();
  await expect(connectBtn).toBeVisible({ timeout: 20_000 });
  await connectBtn.click();
  await screenshotPopup(ctx, shot('02-connect-popup.jpg'));
  await approveOnce(ctx, { timeout: 60_000 });
  await screenshotPopup(ctx, shot('03-approve.jpg'));
  await approveOnce(ctx, { timeout: 90_000 });
}

test('real Freighter: connect + on-chain deposit -> real tx hash', async () => {
  test.setTimeout(300_000);
  const page = await context.newPage();
  const deposit = await captureDepositTx(page);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Nobody loses/i })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: shot('01-landing.jpg'), type: 'jpeg', quality: 85 });

  await page.goto(`${BASE_URL}/play`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Connect to play/i })).toBeVisible({ timeout: 30_000 });

  await connectWallet(context, page);

  await expect(page.getByRole('heading', { name: /Deposit into the pool/i })).toBeVisible({
    timeout: 60_000,
  });
  const amount = page.locator('input[inputmode="decimal"]');
  await amount.fill('2');
  await page.screenshot({ path: shot('04-deposit.jpg'), type: 'jpeg', quality: 85 });

  await page.getByRole('button', { name: /^Deposit/ }).last().click();
  await approveOnce(context, { timeout: 90_000 });

  await expect
    .poll(() => deposit.txHash, { timeout: 120_000, message: 'real on-chain deposit tx hash' })
    .toBeTruthy();
  const txHash = deposit.txHash as string;

  await expect(page.getByRole('heading', { name: /Your position/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Your tickets')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Withdraw/i }).first()).toBeVisible({ timeout: 20_000 });

  const explorer = page.getByRole('link', { name: new RegExp(txHash.slice(0, 4)) });
  // Explorer network segment must match NEXT_PUBLIC_STELLAR_NETWORK (public on mainnet, testnet on testnet).
  const explorerSegment = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public' ? 'public' : 'testnet';
  await expect(explorer.first()).toHaveAttribute(
    'href',
    new RegExp(`stellar\\.expert/explorer/${explorerSegment}/tx/${txHash}`),
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('05-deposit-success.jpg'), type: 'jpeg', quality: 85, fullPage: true });
  // biome-ignore lint/suspicious/noConsole: surface the hash for the report
  console.log('REAL_TX_HASH=' + txHash);

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /by the numbers/i })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: shot('06-stats.jpg'), type: 'jpeg', quality: 85, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/play`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shot('07-mobile.jpg'), type: 'jpeg', quality: 85, fullPage: true });
});
