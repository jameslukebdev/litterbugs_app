import { NextRequest, NextResponse } from 'next/server';
import { loadReportSite } from '@/lib/report-site';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
  try { return NextResponse.json(await loadReportSite(id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Timeline could not be loaded.' }, { status: 503 }); }
}
