import { notFound } from 'next/navigation';
import '../../account/account-theme.css';
import { CleanupHoursPreview } from './preview';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <CleanupHoursPreview />;
}
