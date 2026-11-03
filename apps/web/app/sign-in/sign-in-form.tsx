'use client';
import { communityReturnFromEntry } from '@/lib/community-journey';
import { useRouter } from 'next/navigation';
import { AuthDialog } from '@/components/auth-dialog';
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  return <main className="sign-in-page"><AuthDialog embedded returnPath={next}
    onClose={() => router.push(communityReturnFromEntry(next) ?? '/')} onSuccess={() => { router.replace(next); router.refresh(); }} /></main>;
}
