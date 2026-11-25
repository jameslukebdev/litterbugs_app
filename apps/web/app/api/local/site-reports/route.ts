import { NextRequest, NextResponse } from 'next/server';
import { validateReportDraft, EMPTY_REPORT_DRAFT, isWithinReportDistance } from '@litterbugs/report-contract';
import sharp from 'sharp';
import { localContributionRequest } from '@/lib/local-contribution-privacy';
import { createClient } from '@/lib/supabase/server';
import { loadReportSite } from '@/lib/report-site';
import { saveLocalOccurrence } from '@/lib/local-site-store';

export async function POST(request: NextRequest) {
  const blocked = localContributionRequest(request);
  if (blocked) return new Response(null, { status: blocked });
  if (Number(request.headers.get('content-length') || 0) > 16 * 1024 * 1024) return new Response(null, { status: 413 });
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.is_anonymous) return NextResponse.json({error:'Sign in to report litter.'},{status:401});
  try {
    const data = await request.formData();
    const id = String(data.get('id'));
    const sourceId = String(data.get('sourceId'));
    const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
    if (!uuid.test(id) || !uuid.test(sourceId)) throw new Error('Invalid report.');
    const site = await loadReportSite(sourceId);
    const source = site?.reports.find(row => row.id === sourceId && row.state === 'completed');
    if (!site?.local || !source?.location) throw new Error('This completed cleanup is unavailable.');
    // The local store returns a concurrent submission, including an idempotent retry.
    const origin = JSON.parse(String(data.get('origin')));
    const captured = Date.parse(origin.capturedAt);
    if (!Number.isFinite(captured) || Math.abs(Date.now()-captured)>60000 || !isWithinReportDistance(origin,source.location)) throw new Error('Please check your current location and try again.');
    if (site.currentReportId && !site.reports.find(row=>row.id===site.currentReportId)?.localDevelopment) return NextResponse.json({reportId:site.currentReportId,alreadyReported:true});
    const photos = data.getAll('photos').filter((photo): photo is File => photo instanceof File);
    if (photos.length<1 || photos.length>3 || photos.some(photo=>photo.size>5*1024*1024)) throw new Error('Add one to three photos, up to 5 MB each.');
    const parsed = {...EMPTY_REPORT_DRAFT,...JSON.parse(String(data.get('draft'))),photos};
    if (Object.keys(validateReportDraft(parsed)).length) throw new Error('Check your report details.');
    const images:Buffer[]=[];
    for (const photo of photos) images.push(await sharp(Buffer.from(await photo.arrayBuffer()),{limitInputPixels:40000000}).rotate().resize(1080,1080,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer());
    const result=await saveLocalOccurrence({id,siteId:site.id,sourceReportId:sourceId,reporterId:user.id,createdAt:new Date().toISOString(),title:parsed.title.trim()||'Litter Report',litterTypes:[...parsed.selectedTypes,...(parsed.types.trim()?[parsed.types.trim()]:[])],severity:parsed.severity,notes:[...parsed.selectedNotes,parsed.notes.trim()].filter(Boolean).join(' · '),photoCount:images.length},images);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Report could not be saved.'},{status:400});
  }
}
