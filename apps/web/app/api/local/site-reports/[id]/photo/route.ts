import { NextRequest } from 'next/server';
import { localOccurrence,localOccurrencePhoto } from '@/lib/local-site-store';
import { loadHostedPublicReportShare } from '@/lib/public-report-share';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  if(process.env.NODE_ENV!=='development'||process.env.VERCEL||!['localhost','127.0.0.1','[::1]'].includes(request.nextUrl.hostname))return new Response(null,{status:404});
  const record=await localOccurrence((await params).id);
  // Recheck source visibility on every photo request, never publish withdrawn data.
  if(!record||!await loadHostedPublicReportShare(record.sourceReportId,'linked',true))return new Response(null,{status:404});
  const index=Number(request.nextUrl.searchParams.get('photo')??0);
  const bytes=await localOccurrencePhoto(record.id,index);
  if(!bytes)return new Response(null,{status:404});
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
}
