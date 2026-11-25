import { notFound } from 'next/navigation';
import { CleanupIssuesPreview, type Stage } from './preview';

export const metadata = { title: 'Cleanup issues preview | Litterbugs', robots: { index: false, follow: false } };
const stages: Stage[] = ['cleanup', 'issue', 'inbox', 'reporter', 'edit', 'cleaner-inbox', 'review', 'site'];
export default async function Page({ searchParams }: { searchParams: Promise<{ screen?: string; view?: string; example?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  return <CleanupIssuesPreview initialExample={params.example === 'information'} initialStage={stages.includes(params.screen as Stage) ? params.screen as Stage : 'cleanup'} initialView={params.view === 'web' ? 'web' : 'app'} />;
}
