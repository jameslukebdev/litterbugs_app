import Link from 'next/link';

export default function PaymentReturnPage() {
  return (
    <main className="standalone-page">
      <section className="standalone-card payment-return-card">
        <span className="success-mark">✓</span>
        <h1>Payment submitted</h1>
        <p>Your cleanup reward will update after Stripe confirms the payment.</p>
        <Link className="primary-button button-link" href="/">Return to the map</Link>
      </section>
    </main>
  );
}
