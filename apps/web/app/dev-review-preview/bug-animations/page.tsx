// Development-only review gallery. Production requests return a 404.
import { notFound } from 'next/navigation';
import { Website } from '@/components/public-website';
import { BugAnimations } from './animations';

export const metadata = { title: 'Bug animations preview | Litterbugs', robots: { index: false, follow: false } };

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Website><BugAnimations /></Website>;
}
