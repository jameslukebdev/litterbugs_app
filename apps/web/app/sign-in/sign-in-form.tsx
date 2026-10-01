'use client';
import { useRouter } from 'next/navigation';
import { AuthDialog } from '@/components/auth-dialog';
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  return <main className="sign-in-page"><AuthDialog embedded returnPath={next}
    onClose={() => router.push('/')} onSuccess={() => { router.replace(next); router.refresh(); }} /></main>;
}
