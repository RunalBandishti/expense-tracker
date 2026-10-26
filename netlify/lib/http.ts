import { randomBytes } from 'node:crypto';

const MAX_BODY_BYTES = 2_000_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json');
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

export const noContent = () => new Response(null, { status: 204 });

export function redirect(location: string, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Location', location);
  return new Response(null, { status: 302, headers: responseHeaders });
}

export async function readJson<T>(req: Request): Promise<T> {
  // Requiring JSON blocks cross-site form posts (login CSRF).
  if (!req.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Expected JSON');
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function parseCookies(header: string | null) {
  const cookies: Record<string, string> = {};
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator > 0) cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  return cookies;
}

export function cookie(req: Request, name: string, value: string, maxAgeSeconds: number) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export const randomToken = () => randomBytes(16).toString('base64url');

export const asString = (value: unknown) => (typeof value === 'string' ? value : '');
