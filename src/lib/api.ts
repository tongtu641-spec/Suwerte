export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiException extends Error {
  code: string;
  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
  }
}

// Always unwraps the { ok, data } envelope and throws a typed error on failure.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'same-origin',
  });
  const json = await res.json().catch(() => ({ ok: false, error: { code: 'INTERNAL', message: 'Bad response' } }));
  if (!json.ok) throw new ApiException(json.error ?? { code: 'INTERNAL', message: 'Request failed' });
  return json.data as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
