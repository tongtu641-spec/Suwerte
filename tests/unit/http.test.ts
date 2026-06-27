import { describe, it, expect } from 'vitest';
import { AppError, ok, created, fail, fromError } from '../../src/server/lib/http';

async function body(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe('http envelope', () => {
  it('ok wraps data', async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true, data: { a: 1 } });
  });

  it('created is 201', () => {
    expect(created({ id: 'x' }).status).toBe(201);
  });

  it('fail carries code and status', async () => {
    const res = fail('NOT_FOUND', 'missing', 404);
    expect(res.status).toBe(404);
    const j = await body(res);
    expect((j.error as { code: string }).code).toBe('NOT_FOUND');
  });

  it('fromError maps AppError', async () => {
    const res = fromError(new AppError('FORBIDDEN', 'no', 403));
    expect(res.status).toBe(403);
  });

  it('fromError maps ZodError-like to 400', async () => {
    const res = fromError({ name: 'ZodError', issues: [{ path: ['x'], message: 'bad' }] });
    expect(res.status).toBe(400);
    const j = await body(res);
    expect((j.error as { message: string }).message).toBe('bad');
  });

  it('fromError defaults to 500', async () => {
    expect(fromError(new Error('boom')).status).toBe(500);
  });
});
