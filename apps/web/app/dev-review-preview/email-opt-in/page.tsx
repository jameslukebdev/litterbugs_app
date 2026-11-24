import { notFound } from 'next/navigation';
import { EmailOptInPreview, type PreviewScreen } from './preview';

export const metadata = {
  title: 'Email preferences preview | Litterbugs',
  robots: { index: false, follow: false },
};

const screens: PreviewScreen[] = ['account', 'signup', 'email', 'unsubscribe', 'preferences', 'recipients'];

export default async function Page({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { screen } = await searchParams;
  const initial = screens.includes(screen as PreviewScreen) ? screen as PreviewScreen : 'account';
  return <EmailOptInPreview initialScreen={initial} />;
}
