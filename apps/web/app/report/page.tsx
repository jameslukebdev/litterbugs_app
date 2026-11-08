import { reportEntryContext } from '@/lib/community-journey';
import MapPage from '@/components/map-page';
export const metadata = { title: 'Report litter | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams?: Promise<{ community?: string | string[] }> }) {
  const context = reportEntryContext((await searchParams)?.community);
  return <MapPage initialView="map" searchParams={context ? Promise.resolve({ area: context.area, returnTo: context.returnTo }) : undefined} />;
}
