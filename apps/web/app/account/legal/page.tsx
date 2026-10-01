import Link from 'next/link';
export default function LegalLinks() {
  return <main className="info-page"><h1>Policies and agreements</h1><p>Read the policies that apply to your account, reports, and cleanups.</p><ul>
    <li><Link href="/terms">Terms of use</Link></li><li><Link href="/privacy">Privacy policy</Link></li>
    <li><Link href="/cleanup-policy">Cleanup, contribution, reward and refund policy</Link></li>
    <li><Link href="/cleanup-safety">Cleanup safety and acknowledgment</Link></li>
  </ul></main>;
}
