'use client';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="standalone-page">
      <section className="standalone-card">
        <span className="standalone-icon" aria-hidden>!</span>
        <h1>Something went wrong</h1>
        <p>This page could not load. Check your connection and try again.</p>
        <button className="primary-button" onClick={retry}>Try again</button>
      </section>
    </main>
  );
}
