import { jwtVerify } from 'jose';

export const SESSION_COOKIE = 'iptv_session';

/** Verifica un token JWT (uso desde middleware Edge) */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}
