'use client';
import { communityReturnFromEntry } from '@/lib/community-journey';
import { useRouter } from 'next/navigation';
import { AuthDialog, authEntryMode } from '@/components/auth-dialog';
export function SignInForm({ next, message }: { next: string; message?: string }) {
  const router = useRouter();
  const destination = new URL(next, 'https://litterbugs.app');
  const funding = destination.pathname === '/map' && destination.searchParams.has('report') && destination.searchParams.get('intent') === 'fund';
  const intent = funding ? 'fund' : destination.pathname === '/report' ? 'report' : null;
  return <main className="sign-in-page"><AuthDialog embedded intent={intent} initialMode={authEntryMode(intent)} returnPath={next} initialMessage={message}
    onClose={() => router.push(communityReturnFromEntry(next) ?? '/')} onSuccess={() => { router.replace(next); router.refresh(); }} /></main>;
}
