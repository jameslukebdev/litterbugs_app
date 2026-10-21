import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import styles from '../about/about-simple.module.css';

export const metadata: Metadata = {
  alternates: { canonical: '/cleanup-safety' },
  title: 'Cleanup Safety | Litterbugs',
  description: 'Simple precautions for choosing a site, handling litter, and cleaning safely with Litterbugs.',
};

export default function CleanupSafetyPage() {
  return <>
    <PublicSiteHeader activePath="/cleanup-safety" />
    <main className={styles.page}>
      <h1>Cleanup safety</h1>
      <p>Helping your community should never mean putting yourself at risk. A report on the map does not mean a site is safe. Choose only work you can do safely and legally.</p>
      <p><strong>Check the site first.</strong> Look for traffic, uneven ground, weather hazards, animals, and anything beyond your ability. Work in daylight and good weather. Stop or leave if conditions become unsafe.</p>
      <p><strong>Stay out of dangerous areas.</strong> Do not enter roadways, railroads, waterways, unstable terrain, construction zones, or restricted areas. Get permission before entering private property. Park safely and legally, and never use the app while driving.</p>
      <p><strong>Wear the right gear.</strong> Bring suitable gloves, sturdy closed-toe shoes, and clothing that protects your arms and legs. Wear high-visibility clothing where vehicles may be nearby. Use tools and protective equipment suited to the cleanup.</p>
      <p><strong>Leave hazardous items alone.</strong> Do not touch needles, syringes, chemicals, damaged batteries, medical waste, human or animal remains, weapons, explosives, pressurized containers, or unknown liquids or powders. If you cannot identify something or handle it safely, leave it in place and contact the appropriate local authority.</p>
      <p><strong>Respect other people.</strong> Do not confront anyone, disturb encampments, or move suspicious property. Leave work that needs permits, specialized training, or licensed disposal to qualified professionals.</p>
      <p><strong>Plan for disposal.</strong> Follow local rules for trash and recycling. Avoid overfilled bags and loads you cannot lift safely. Arrange lawful disposal before you start.</p>
      <p><strong>Know when to get help.</strong> Move to a safe place and call 911 for an immediate emergency. Report hazardous waste to your local public works or waste-management authority. Litterbugs is not an emergency service.</p>
      <p><strong>Before you claim a cleanup.</strong> You must be 18 or older, read and accept the cleanup acknowledgment, and confirm that you can safely and legally clean that location. Read the <Link href="/cleanup-safety/acknowledgment">full safety acknowledgment and waiver</Link> and the <Link href="/cleanup-policy">cleanup and reward policy</Link>.</p>
      <p><strong>Questions?</strong> Email <a href="mailto:admin@litterbugs.app">admin@litterbugs.app</a>.</p>
    </main>
  </>;
}
