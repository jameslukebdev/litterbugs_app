import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock('@/lib/supabase/proxy', () => ({ updateSession }));
import { proxy } from './proxy';
beforeEach(() => updateSession.mockImplementation(async () => NextResponse.next()));

it.each(['https://litterbugs.app/reports', 'https://www.litterbugs.app/reports/history'])(
  'does not apply preview noindex to the actual production URL %s', async url => {
    expect((await proxy(new NextRequest(url))).headers.get('X-Robots-Tag')).toBeNull();
  },
);
it.each(['http://localhost:3000/reports', 'http://127.0.0.1:3000/reports', 'https://preview.vercel.app/reports'])(
  'keeps the preview URL %s out of search', async url => {
    expect((await proxy(new NextRequest(url))).headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  },
);
