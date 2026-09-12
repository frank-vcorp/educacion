import { NextResponse } from 'next/server';

/** Health check para Coolify / Traefik (GET /api/health). */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'nem-plataforma' }, { status: 200 });
}
