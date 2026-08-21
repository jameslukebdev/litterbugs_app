'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="standalone-page">
      <section className="standalone-card">
        <span className="standalone-icon" aria-hidden>!</span>
        <h1>Something went wrong</h1>
        <p>The map could not start. Check your connection and try again.</p>
        <button className="primary-button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
