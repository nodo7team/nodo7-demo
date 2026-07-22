import { NextResponse } from 'next/server';
import { syncAll } from '@/lib/platforms/sync';
import { logAction } from '@/lib/db/actions-log';

export async function POST() {
  try {
    const result = await syncAll();
    await logAction({
      action: 'sync',
      payload: {},
      result: result as any,
      success: !result.clicktv.error && !result.raptor.error,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error de sincronización' }, { status: 500 });
  }
}
