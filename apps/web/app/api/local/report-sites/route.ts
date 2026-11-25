import { NextRequest, NextResponse } from 'next/server';
import { localContributionRequest } from '@/lib/local-contribution-privacy';
import { saveLocalSiteReport } from '@/lib/local-report-sites';
import { validateReportDraft, EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  const blocked = localContributionRequest(request);
  if (blocked) return new Response(null, { status: blocked });
  if (Number(request.headers.get('content-length') || 0) > 16 * 1024 * 1024) return new Response(null, { status: 413 });
  try {
    const data = await request.formData();
    const draft = JSON.parse(String(data.get('draft')));
    const id = String(data.get('id'));
    if (!/^f0000000-0000-4000-8000-[0-9a-f]{12}$/.test(id)) throw new Error('Invalid report');
    const photos = data.getAll('photos').filter((photo): photo is File => photo instanceof File);
    if (photos.length < 1 || photos.length > 3 || photos.some(photo => photo.size > 5 * 1024 * 1024)) throw new Error('Add one to three photos, up to 5 MB each.');
    const parsed = { ...EMPTY_REPORT_DRAFT, ...draft, photos };
    if (Object.keys(validateReportDraft(parsed)).length) throw new Error('Check your report details.');
    const images = await Promise.all(photos.map(async photo => {
      const bytes = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 40000000 }).rotate().resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      return `data:image/jpeg;base64,${bytes.toString('base64')}`;
    }));
    const result = await saveLocalSiteReport({ id, title: parsed.title.trim(), litterTypes: [...parsed.selectedTypes, ...(parsed.types.trim() ? [parsed.types.trim()] : [])], severity: parsed.severity, notes: [...parsed.selectedNotes, parsed.notes.trim()].filter(Boolean).join(' · '), photos: images });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Report could not be saved.' }, { status: 400 }); }
}
