import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'iptv_session';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 días

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(secret);
}

/** Crea una sesión JWT y la guarda en cookie httpOnly */
export async function createSession(): Promise<string> {
  const token = await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });

  return token;
}

/** Verifica si hay una sesión activa */
export async function getSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

/** Cierra sesión */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Verifica un PIN contra el hash guardado */
export async function verifyPin(pin: string): Promise<boolean> {
  const hash = process.env.APP_PIN_HASH;
  if (!hash) {
    console.error('APP_PIN_HASH no está configurado');
    return false;
  }
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}

/** Genera un hash bcrypt de un PIN (usado por el script set-pin) */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export { SESSION_COOKIE };
