import { findCommunityForPlace } from '@/lib/community-finder';

export const runtime = 'nodejs';

/**
 * The leaderboard for a typed place: GET /communities/find?q=banner+elk. Called when someone presses
 * Search in the town finder, never on each keystroke. Answers hold no personal data and are cached.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) {
    return Response.json({ status: 'unknown' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const result = await findCommunityForPlace(query);
    return Response.json(result, {
      status: result.status === 'busy' ? 503 : 200,
      headers: { 'Cache-Control': result.status === 'busy' ? 'no-store' : 'public, max-age=3600' },
    });
  } catch (error) {
    console.error('Town search failed', error);
    return Response.json({ status: 'busy' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
