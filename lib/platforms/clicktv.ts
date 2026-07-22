// ════════════════════════════════════════════════════════════════
// Cliente ClickTV (XUI Panel API)
// Doc base: action=create_line / edit_line / get_line / get_lines / etc.
// ════════════════════════════════════════════════════════════════

import { CLICKTV_PACKAGES } from '@/types';

function getConfig() {
  const apiKey = process.env.XUI_API_KEY;
  const baseUrl = process.env.XUI_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error('XUI_API_KEY y XUI_BASE_URL son requeridos');
  }
  return { apiKey, baseUrl };
}

/** Construye URL con api_key y action */
function buildUrl(action: string): string {
  const { apiKey, baseUrl } = getConfig();
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}api_key=${encodeURIComponent(apiKey)}&action=${action}`;
}

/** Hace POST con form-urlencoded a la API XUI */
async function postForm(action: string, body: Record<string, string | number> = {}): Promise<any> {
  const url = buildUrl(action);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    form.append(k, String(v));
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, _parseError: true };
  }
}

async function getJson(action: string): Promise<any> {
  const url = buildUrl(action);
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, _parseError: true };
  }
}

// ────────────────────────────────────────────────────────────────
// Info de usuario
// ────────────────────────────────────────────────────────────────
export interface UserInfo {
  username?: string;
  id?: number;
  credits?: number;
  group_id?: number;
  [k: string]: any;
}

export async function getUserInfo(): Promise<UserInfo> {
  return getJson('user_info');
}

// ────────────────────────────────────────────────────────────────
// Líneas
// ────────────────────────────────────────────────────────────────
export interface LineRaw {
  id: number;
  username: string;
  password?: string;
  max_connections?: number;
  exp_date?: number | string;
  enabled?: number | boolean;
  is_trial?: number | boolean;
  package_id?: number | null;
  member_username?: string;
  [k: string]: any;
}

/** Lista líneas paginadas */
export async function listLines(start = 0, length = 200): Promise<{
  data: LineRaw[];
  recordsTotal?: number;
}> {
  const res = await postForm('get_lines', { draw: 1, start, length });
  return {
    data: res?.data ?? [],
    recordsTotal: res?.recordsTotal,
  };
}

/** Trae TODAS las líneas paginando hasta el final */
export async function listAllLines(): Promise<LineRaw[]> {
  const first = await listLines(0, 1);
  const total = first?.recordsTotal ?? 0;
  if (total === 0) return first.data ?? [];

  const pageSize = 50;
  const all: LineRaw[] = [];
  for (let start = 0; start < total + pageSize; start += pageSize) {
    const { data } = await listLines(start, pageSize);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (all.length >= total) break;
  }
  return all;
}

/** Info de una línea */
export async function getLine(id: number): Promise<LineRaw | null> {
  const res = await postForm('get_line', { id });
  if (!res || res._parseError) return null;
  return res?.data ?? res;
}

/** Crear línea (paga o demo) */
export interface CreateLineInput {
  package: number;
  username?: string;
  password?: string;
  trial?: 0 | 1;
}

export async function createLine(input: CreateLineInput): Promise<any> {
  const body: Record<string, string | number> = {
    package: input.package,
    trial: input.trial ?? 0,
    is_isplock: 0,
  };
  if (input.username) body.username = input.username;
  if (input.password) body.password = input.password;
  return postForm('create_line', body);
}

/** Renovar / cambiar paquete / cambiar password de una línea */
export interface EditLineInput {
  id: number;
  package?: number;
  password?: string;
  username?: string;
}

export async function editLine(input: EditLineInput): Promise<any> {
  const body: Record<string, string | number> = { id: input.id };
  if (input.package !== undefined) body.package = input.package;
  if (input.password) body.password = input.password;
  if (input.username) body.username = input.username;
  return postForm('edit_line', body);
}

export async function disableLine(id: number): Promise<any> {
  return postForm('disable_line', { id });
}

export async function enableLine(id: number): Promise<any> {
  return postForm('enable_line', { id });
}

export async function deleteLine(id: number): Promise<any> {
  return postForm('delete_line', { id });
}

// ────────────────────────────────────────────────────────────────
// Inferencia de package_id cuando la API devuelve null
// (replicada de la doc del usuario)
// ────────────────────────────────────────────────────────────────
export function inferPackageId(maxConnections: number, expDaysApprox = 30): number {
  const conn = Math.max(1, Math.min(4, maxConnections || 4));
  const offset = conn - 1;
  let base: number;
  if (expDaysApprox <= 35) base = 2;
  else if (expDaysApprox <= 100) base = 11;
  else if (expDaysApprox <= 200) base = 15;
  else base = 19;
  return base + offset;
}

/** Devuelve el label de un package por id */
export function packageLabel(id: number | null | undefined): string {
  if (!id) return 'Desconocido';
  const pkg = CLICKTV_PACKAGES.find((p) => p.id === id);
  return pkg?.name ?? `Paquete ${id}`;
}

// ────────────────────────────────────────────────────────────────
// Helpers de parsing
// ────────────────────────────────────────────────────────────────
export function parseExpDate(exp: number | string | undefined | null): string | null {
  if (!exp) return null;
  const ts = typeof exp === 'string' ? parseInt(exp, 10) : exp;
  if (!ts || isNaN(ts)) return null;
  const d = new Date(ts * 1000);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}
