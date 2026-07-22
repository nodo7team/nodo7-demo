import { supabaseAdmin } from '@/lib/db/supabase';
import type { Action, Platform } from '@/types';

export interface LogActionInput {
  action: Action;
  platform?: Platform;
  line_id?: string | null;
  client_id?: string | null;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  success?: boolean;
  error_message?: string;
}

export async function logAction(input: LogActionInput): Promise<void> {
  try {
    await supabaseAdmin.from('actions_log').insert({
      action: input.action,
      platform: input.platform ?? null,
      line_id: input.line_id ?? null,
      client_id: input.client_id ?? null,
      payload: input.payload ?? null,
      result: input.result ?? null,
      success: input.success ?? true,
      error_message: input.error_message ?? null,
    });
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}
