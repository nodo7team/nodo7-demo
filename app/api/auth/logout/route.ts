import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST(req: Request) {
  await destroySession();
  // Si viene de form HTML, redirigir
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.json({ ok: true });
}
