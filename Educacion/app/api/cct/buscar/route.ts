/**
 * API route: búsqueda de CCT por nombre o clave.
 * SPEC_TEC_04 D-FIN-4 (paso 2).
 */
import { NextResponse } from 'next/server';
import { getCCTByClave, buscarCCTs } from '@/services/catalogo/catalogo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const clave = searchParams.get('clave');

  if (clave) {
    const cct = await getCCTByClave(clave);
    return NextResponse.json({ cct });
  }
  if (q) {
    const results = await buscarCCTs(q);
    return NextResponse.json({ results });
  }
  return NextResponse.json({ results: [] });
}
