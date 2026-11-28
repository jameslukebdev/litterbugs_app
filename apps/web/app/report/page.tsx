import MapPage from '@/components/map-page';
export const metadata = { title: 'Report litter | Litterbugs', robots: { index: false, follow: false } };
export default async function Page() {
  return <MapPage initialView="map" />;
}
