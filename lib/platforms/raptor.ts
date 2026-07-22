// ════════════════════════════════════════════════════════════════
// Cliente Raptor TV (HTTP scraping con cookies)
// Endpoints: log.php, register.php, renovaruser.php, edituser.php,
//            bloquearuser.php, borraruser.php
// ════════════════════════════════════════════════════════════════

import { CookieJar } from 'tough-cookie';

function getConfig() {
  const url = process.env.RAPTOR_URL;
  const user = process.env.RAPTOR_USER;
  const pass = process.env.RAPTOR_PASS;
  if (!url || !user || !pass) {
    throw new Error('RAPTOR_URL, RAPTOR_USER, RAPTOR_PASS son requeridos');
  }
  return { url, user, pass };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Helper: armar header Cookie desde el jar */
async function cookieHeader(jar: CookieJar, url: string): Promise<string> {
  return jar.getCookieString(url);
}

/** Helper: guardar cookies de Set-Cookie en el jar */
async function storeCookies(jar: CookieJar, res: Response, url: string): Promise<void> {
  // node-fetch / undici exponen los Set-Cookie via getSetCookie() en Node 18+
  // Si no está disponible, fallback a raw header
  let setCookies: string[] = [];
  if (typeof (res.headers as any).getSetCookie === 'function') {
    setCookies = (res.headers as any).getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) setCookies = [raw];
  }
  for (const c of setCookies) {
    try {
      await jar.setCookie(c, url);
    } catch {
      // ignorar cookies malformadas
    }
  }
}

/** Login en Raptor — devuelve un jar de cookies listo para usar */
export async function login(): Promise<CookieJar> {
  const { url, user, pass } = getConfig();
  const jar = new CookieJar();
  const loginUrl = `${url}/log.php`;

  const body = new URLSearchParams({
    name: user,
    pass: pass,
    entrar: 'Iniciar Session',
  });

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Referer: `${url}/`,
    },
    body: body.toString(),
    redirect: 'manual',
    cache: 'no-store',
  });

  await storeCookies(jar, res, url);
  return jar;
}

/** Helper: hace request autenticado (con cookies) */
async function authedRequest(
  jar: CookieJar,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { url } = getConfig();
  const fullUrl = `${url}${path}`;
  const cookies = await cookieHeader(jar, fullUrl);
  return fetch(fullUrl, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'User-Agent': UA,
      Cookie: cookies,
    },
    cache: 'no-store',
  });
}

// ────────────────────────────────────────────────────────────────
// Crear cuenta
// ────────────────────────────────────────────────────────────────
export interface CreateRaptorInput {
  name: string;
  email: string;
  password?: string; // default '123456'
  tipo?: 1 | 2;       // 2=premium
  dispositivos?: 1 | 2; // 2=3 pantallas
}

export async function createAccount(input: CreateRaptorInput): Promise<{ ok: boolean; html: string }> {
  const { url } = getConfig();
  const jar = await login();

  const body = new URLSearchParams({
    name: input.name,
    email: input.email,
    pass: input.password ?? '123456',
    Tipo: String(input.tipo ?? 2),
    Dispositivos: String(input.dispositivos ?? 2),
    crearus: 'Crear usuario',
  });

  const res = await authedRequest(jar, '/register.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${url}/register.php`,
    },
    body: body.toString(),
  });

  const html = await res.text();
  return { ok: res.ok, html };
}

// ────────────────────────────────────────────────────────────────
// Renovar cuenta
// ────────────────────────────────────────────────────────────────
export async function renewAccount(email: string, months: number): Promise<{ ok: boolean; html: string }> {
  const { url } = getConfig();
  const jar = await login();

  const body = new URLSearchParams({
    usr: email,
    meses: String(months),
  });

  const path = `/renovaruser.php?usr=${encodeURIComponent(email)}`;
  const res = await authedRequest(jar, path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${url}${path}`,
      Origin: url,
    },
    body: body.toString(),
  });

  const html = await res.text();
  return { ok: res.ok, html };
}

// ────────────────────────────────────────────────────────────────
// Bloquear / Desbloquear
// ────────────────────────────────────────────────────────────────
export async function blockAccount(email: string): Promise<boolean> {
  const jar = await login();
  const path = `/bloquearuser.php?usr=${encodeURIComponent(email)}&accion=bloquear`;
  const res = await authedRequest(jar, path);
  return res.ok;
}

export async function unblockAccount(email: string): Promise<boolean> {
  const jar = await login();
  const path = `/bloquearuser.php?usr=${encodeURIComponent(email)}&accion=desbloquear`;
  const res = await authedRequest(jar, path);
  return res.ok;
}

// ────────────────────────────────────────────────────────────────
// Eliminar
// ────────────────────────────────────────────────────────────────
export async function deleteAccount(email: string): Promise<boolean> {
  const jar = await login();
  const path = `/borraruser.php?usr=${encodeURIComponent(email)}`;
  const res = await authedRequest(jar, path);
  return res.ok;
}

// ────────────────────────────────────────────────────────────────
// Listar cuentas (parsear edituser.php)
// ────────────────────────────────────────────────────────────────
export interface RaptorAccount {
  email: string;
  expires_at: string | null;   // YYYY-MM-DD
  blocked?: boolean;
}

/** Parsea el HTML de edituser.php para extraer todas las cuentas */
export function parseAccountsHtml(html: string): RaptorAccount[] {
  const accounts: RaptorAccount[] = [];

  // Buscar todas las filas: necesitamos email y fecha de expiración
  // Pattern aproximado: value="EMAIL"... expire_tv ... value="YYYY-MM-DD"
  const pattern = /value="([^"]+@[^"]+)"[\s\S]*?expire_tv[\s\S]*?value="(\d{4}-\d{2}-\d{2})"/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    accounts.push({
      email: match[1],
      expires_at: match[2],
    });
  }

  return accounts;
}

/** Lista todas las cuentas */
export async function listAccounts(): Promise<RaptorAccount[]> {
  const jar = await login();
  const res = await authedRequest(jar, '/edituser.php');
  const html = await res.text();
  return parseAccountsHtml(html);
}

/** Parsea el HTML para extraer el número de créditos */
export function parseCreditsHtml(html: string): number | null {
  // Reemplazar entidades HTML comunes
  const cleanHtml = html
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/g, 'í')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' '); // normalizar espacios

  // Intentar varios patrones regex flexibles
  const regexes = [
    /cr[eé]ditos\s*(?:disponibles)?\s*:\s*<\/?[a-z0-9]+[^>]*>\s*(\d+)/i,
    /cr[eé]ditos\s*(?:disponibles)?\s*:\s*(\d+)/i,
    /credits?\s*:\s*<\/?[a-z0-9]+[^>]*>\s*(\d+)/i,
    /credits?\s*:\s*(\d+)/i,
    /saldo\s*:\s*<\/?[a-z0-9]+[^>]*>\s*(\d+)/i,
    /saldo\s*:\s*(\d+)/i,
    /(\d+)\s*cr[eé]ditos?/i,
    /(\d+)\s*credits?/i,
  ];

  for (const regex of regexes) {
    const match = cleanHtml.match(regex);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val)) return val;
    }
  }

  return null;
}

/** Obtiene créditos del revendedor */
export async function getCredits(): Promise<number | null> {
  const jar = await login();
  const res = await authedRequest(jar, '/edituser.php');
  const html = await res.text();
  return parseCreditsHtml(html);
}

/** Estado de una cuenta específica */
export async function getAccountStatus(email: string): Promise<RaptorAccount | null> {
  const accounts = await listAccounts();
  return accounts.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

// ────────────────────────────────────────────────────────────────
// Reset password — via edituser.php (GET para leer el form + POST con
// todos los campos actuales para no pisar nombre/fecha/pantallas).
// ────────────────────────────────────────────────────────────────

/** Parsea todos los campos de un form HTML en un Record */
function parseFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // <input ...> — ignorar type="password" y type="file"
  const inputRe = /<input\b([^>]*)(?:\s\/?>|>)/gi;
  let m: RegExpExecArray | null;
  while ((m = inputRe.exec(html)) !== null) {
    const attrs = m[1];
    const name  = /\bname="([^"]+)"/i.exec(attrs)?.[1];
    const type  = (/\btype="([^"]+)"/i.exec(attrs)?.[1] ?? 'text').toLowerCase();
    const value = /\bvalue="([^"]*)"/i.exec(attrs)?.[1] ?? '';
    if (name && type !== 'password' && type !== 'file') {
      fields[name] = value;
    }
  }

  // <select name="..."><option selected value="...">
  const selectRe = /<select\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi;
  while ((m = selectRe.exec(html)) !== null) {
    const name  = m[1];
    const inner = m[2];
    // Opción selected, si existe; si no, la primera opción
    const selMatch   = /<option\b[^>]*\bselected\b[^>]*\bvalue="([^"]*)"[^>]*>|<option\b[^>]*\bvalue="([^"]*)"[^>]*\bselected\b/i.exec(inner);
    const firstMatch = /\bvalue="([^"]*)"/i.exec(inner);
    if (name) {
      fields[name] = selMatch ? (selMatch[1] ?? selMatch[2] ?? '') : (firstMatch?.[1] ?? '');
    }
  }

  // <textarea name="...">valor</textarea>
  const textareaRe = /<textarea\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/gi;
  while ((m = textareaRe.exec(html)) !== null) {
    if (m[1]) fields[m[1]] = m[2] ?? '';
  }

  return fields;
}

export async function resetPassword(email: string, newPassword: string): Promise<boolean> {
  const { url } = getConfig();
  const jar = await login();

  const path = `/edituser.php?usr=${encodeURIComponent(email)}`;

  // ── 1. GET del formulario para capturar todos los campos actuales ──
  const getRes = await authedRequest(jar, path);
  if (!getRes.ok) return false;
  const html = await getRes.text();

  const fields = parseFormFields(html);

  // ── 2. Sobreescribir solo la contraseña ──
  fields['pass'] = newPassword;

  // Asegurar que el botón submit esté incluido
  if (!fields['editar']) fields['editar'] = 'Editar usuario';

  // ── 3. POST con el form completo ──
  const res = await authedRequest(jar, path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${url}${path}`,
      Origin: url,
    },
    body: new URLSearchParams(fields).toString(),
  });

  if (!res.ok) return false;

  // Raptor a veces devuelve 200 con mensaje de error en el body
  const responseText = await res.text();
  const lowerText = responseText.toLowerCase();
  if (lowerText.includes('error') || lowerText.includes('no autorizado') || lowerText.includes('unauthorized')) {
    return false;
  }

  return true;
}
