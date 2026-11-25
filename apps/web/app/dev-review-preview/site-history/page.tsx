import { notFound } from 'next/navigation';
import { SiteHistoryPreview, type Scene } from './preview';

export const metadata = { title: 'Site history preview | Litterbugs', robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ screen?: string; view?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const scenes = ['cleaned', 'report', 'review', 'active', 'history', 'duplicate'];
  const initial = scenes.includes(params.screen ?? '') ? params.screen as Scene : 'cleaned';
  return <SiteHistoryPreview initialScene={initial} initialView={params.view === 'web' ? 'web' : 'app'} />;
}
