import { NextResponse } from 'next/server';
import { syncAll } from '@/lib/platforms/sync';

export async function GET(req: Request) {
  // Verificar que viene de Vercel Cron o tiene el secreto
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAll();

    // Sincronizar Google Sheets en segundo plano
    try {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      await fetch(`${protocol}://${host}/api/sync/sheets`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to sync sheets in cron job:', err);
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
