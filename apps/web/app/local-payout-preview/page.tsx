import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { localPreviewAllowed } from './local-only';
import Preview from './preview';

export const metadata: Metadata = { title: 'Payout step previews | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  if (!localPreviewAllowed((await headers()).get('host'))) notFound();
  const { step } = await searchParams;
  return <Preview initialStep={step} />;
}
