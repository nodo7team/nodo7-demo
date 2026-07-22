import { NextResponse } from 'next/server';
import { verifyPin, createSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN inválido' }, { status: 400 });
    }

    const ok = await verifyPin(pin);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error del servidor' },
      { status: 500 },
    );
  }
}
