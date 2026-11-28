import { notFound } from 'next/navigation';
import { CleanupStartPreview } from './preview';

export const metadata = { title: 'Cleanup start preview', robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <CleanupStartPreview />;
}
