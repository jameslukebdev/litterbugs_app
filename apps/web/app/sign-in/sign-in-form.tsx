'use client';
import { communityReturnFromEntry } from '@/lib/community-journey';
import { useRouter } from 'next/navigation';
import { AuthDialog } from '@/components/auth-dialog';
export function SignInForm({ next, message }: { next: string; message?: string }) {
  const router = useRouter();
  const destination = new URL(next, 'https://litterbugs.app');
  const funding = destination.pathname === '/map' && destination.searchParams.has('report') && destination.searchParams.get('intent') === 'fund';
  return <main className="sign-in-page"><AuthDialog embedded intent={funding ? 'fund' : null} returnPath={next} initialMessage={message}
    onClose={() => router.push(communityReturnFromEntry(next) ?? '/')} onSuccess={() => { router.replace(next); router.refresh(); }} /></main>;
}
