import { cookies } from 'next/headers';
import { eq, gt, and } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { sessions } from '@/server/db/schema';

export async function createSession(publicKey: string): Promise<void> {
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
  const [row] = await db.insert(sessions).values({ publicKey, expiresAt }).returning();
  const jar = await cookies();
  jar.set(env.SESSION_COOKIE_NAME, row.id, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS,
  });
}

export async function getSessionPublicKey(): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(env.SESSION_COOKIE_NAME)?.value;
  if (!id) return null;
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.publicKey ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(env.SESSION_COOKIE_NAME)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  jar.delete(env.SESSION_COOKIE_NAME);
}

export async function requirePublicKey(): Promise<string> {
  const pk = await getSessionPublicKey();
  if (!pk) {
    const { AppError } = await import('@/server/lib/http');
    throw new AppError('UNAUTHORIZED', 'Connect your wallet to continue', 401);
  }
  return pk;
}
