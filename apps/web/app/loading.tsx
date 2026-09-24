import Image from 'next/image';
export default function Loading() {
  return <main className="loading-page app-loading" aria-label="Loading Litterbugs"><Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={130} height={89} priority /><span className="spinner" /><p role="status">Loading your community…</p></main>;
}
