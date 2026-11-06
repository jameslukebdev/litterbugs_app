'use client';
import { useState } from 'react';
import { communityReturnFromEntry } from '@/lib/community-journey';
import { useRouter } from 'next/navigation';
import { AuthDialog, authEntryMode } from '@/components/auth-dialog';
export function SignInForm({ next, message }: { next: string; message?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const destination = new URL(next, 'https://litterbugs.app');
  const action = destination.searchParams.get('intent');
  const intent = destination.pathname === '/map' && destination.searchParams.has('report') && (action === 'fund' || action === 'clean')
    ? action : destination.pathname === '/report' ? 'report' : null;
  // The form sits over the live map. Closing leaves that map in place (no reload) and just
  // updates the address to the map's, so visitors keep exploring without a jump.
  const close = () => {
    const community = communityReturnFromEntry(next);
    if (community) { router.replace(community); return; }
    setOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('next'); params.delete('google'); params.set('view', 'map');
    window.history.replaceState(window.history.state, '', `/map?${params}${window.location.hash}`);
    document.title = 'Explore the litter map | Litterbugs';
  };
  if (!open) return null;
  return <AuthDialog intent={intent} initialMode={authEntryMode(intent)} returnPath={next} initialMessage={message}
    onClose={close} onSuccess={() => { router.replace(next); router.refresh(); }} />;
}
