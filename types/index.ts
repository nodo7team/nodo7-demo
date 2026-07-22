// ─────────────────────────────────────────────────────────
// Tipos globales del dominio
// ─────────────────────────────────────────────────────────

export type Platform = 'clicktv' | 'raptor';

export type LineStatus = 'active' | 'expiring' | 'expired' | 'blocked' | 'demo';

export type Action =
  | 'create_paid'
  | 'create_demo'
  | 'renew'
  | 'renew_pass'
  | 'reset_password'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'sync';

export interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Line {
  id: string;
  client_id: string | null;
  platform: Platform;
  external_id: string;
  username: string;
  password: string | null;
  screens: number;
  package_id: number | null;
  package_label: string | null;
  expires_at: string | null;
  status: LineStatus;
  last_synced_at: string | null;
  synced_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  body: string;
  variables: string[];
  platform: Platform | null;
  updated_at: string;
}

export type DemoStatus = 'ok' | 'error' | 'blocked';

export interface DemoRequest {
  id: string;
  name: string;
  phone: string;
  ip: string;
  package_id: 6 | 7;
  username: string | null;
  password: string | null;
  line_id: string | null;
  status: DemoStatus;
  error_msg: string | null;
  created_at: string;
  // joins opcionales
  client_id?: string | null;   // si el teléfono ya es cliente
  client_name?: string | null;
  line_status?: string | null;
}

export interface ActionLog {
  id: string;
  action: Action;
  platform: Platform | null;
  line_id: string | null;
  client_id: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AppConfig {
  id: number;
  pin_hash: string | null;
  last_full_sync_at: string | null;
  clicktv_credits: number | null;
  raptor_credits: number | null;
  updated_at: string;
}

export interface LineShare {
  id: string;
  line_id: string;
  client_id: string;
  screens: number;
  notes: string | null;
  created_at: string;
  clients?: {
    id: string;
    name: string | null;
    phone: string | null;
  };
}

export interface ClientWithLines extends Client {
  active_lines: number;
  total_lines: number;
  next_expiry: string | null;
  lines: Array<{
    id: string;
    platform: Platform;
    username: string;
    screens: number;
    expires_at: string | null;
    status: LineStatus;
  }> | null;
}

// ── ClickTV packages ──
export interface ClickTVPackage {
  id: number;
  name: string;
  credits: number;
  duration_months: number;
  screens: number;
  is_trial: boolean;
}

export const CLICKTV_PACKAGES: ClickTVPackage[] = [
  { id: 2, name: '1 Mes - 1 Conexión', credits: 1, duration_months: 1, screens: 1, is_trial: false },
  { id: 3, name: '1 Mes - 2 Conexiones', credits: 1, duration_months: 1, screens: 2, is_trial: false },
  { id: 4, name: '1 Mes - 3 Conexiones', credits: 1, duration_months: 1, screens: 3, is_trial: false },
  { id: 5, name: '1 Mes - 4 Conexiones', credits: 1, duration_months: 1, screens: 4, is_trial: false },
  { id: 11, name: '3 Meses - 1 Conexión', credits: 3, duration_months: 3, screens: 1, is_trial: false },
  { id: 12, name: '3 Meses - 2 Conexiones', credits: 3, duration_months: 3, screens: 2, is_trial: false },
  { id: 13, name: '3 Meses - 3 Conexiones', credits: 3, duration_months: 3, screens: 3, is_trial: false },
  { id: 14, name: '3 Meses - 4 Conexiones', credits: 3, duration_months: 3, screens: 4, is_trial: false },
  { id: 15, name: '6 Meses - 1 Conexión', credits: 6, duration_months: 6, screens: 1, is_trial: false },
  { id: 16, name: '6 Meses - 2 Conexiones', credits: 6, duration_months: 6, screens: 2, is_trial: false },
  { id: 17, name: '6 Meses - 3 Conexiones', credits: 6, duration_months: 6, screens: 3, is_trial: false },
  { id: 18, name: '6 Meses - 4 Conexiones', credits: 6, duration_months: 6, screens: 4, is_trial: false },
  { id: 19, name: '12 Meses - 1 Conexión', credits: 12, duration_months: 12, screens: 1, is_trial: false },
  { id: 20, name: '12 Meses - 2 Conexiones', credits: 12, duration_months: 12, screens: 2, is_trial: false },
  { id: 21, name: '12 Meses - 3 Conexiones', credits: 12, duration_months: 12, screens: 3, is_trial: false },
  { id: 22, name: '12 Meses - 4 Conexiones', credits: 12, duration_months: 12, screens: 4, is_trial: false },
  { id: 7, name: 'DEMO 1 HORA FULL', credits: 0, duration_months: 0, screens: 1, is_trial: true },
  { id: 6, name: 'DEMO 4 HORAS (sin eventos)', credits: 0, duration_months: 0, screens: 1, is_trial: true },
  { id: 32, name: 'DEMO 2 HORAS (sin eventos)', credits: 0, duration_months: 0, screens: 1, is_trial: true },
  { id: 33, name: 'DEMO 1 HORA (sin eventos)', credits: 0, duration_months: 0, screens: 1, is_trial: true },
];

export const RAPTOR_DURATIONS = [
  { months: 1, label: '1 mes' },
  { months: 3, label: '3 meses' },
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
];
