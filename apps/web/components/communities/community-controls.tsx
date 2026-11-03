'use client';

import Link from 'next/link';
import { trackCommunityEngagement } from '@/lib/website-analytics';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { IoCheckmarkOutline, IoLeafOutline, IoPeopleOutline, IoWaterOutline } from 'react-icons/io5';
import { ModalShell } from '@/components/modal-shell';
import { LocationSearch } from '@/components/public-website/location-search';
import { communityResources, resourcesForCommunity, helpCategories, type HelpCategory } from '@/lib/community-resources';
import styles from './communities.module.css';
import journey from './community-journey.module.css';
import { CommunitySelect } from './community-select';
import { COMMUNITY_SAVED_EVENT, communityIsSaved, setCommunitySaved } from '@/lib/community-bookmarks';

export function CommunitySearch() {
  const [interest, setInterest] = useState<'all' | 'cleanups' | 'groups' | 'results'>('all');
  const options = [{value:'all', label:'All activity'}, {value:'cleanups', label:'Cleanups'}, {value:'groups', label:'Groups & help'}, {value:'results', label:'Cleanup results'}] as const;
  return <div id="find-community" className={styles.communityFinder}>
    <CommunitySelect label="Activity type" value={interest} options={[...options]} onChange={value => setInterest(value as typeof interest)} />
    <LocationSearch communityMode interest={interest} />
  </div>;
}

export function ResourceDirectory({ organizationSlug, communitySlug }: { organizationSlug?: string; communitySlug?: string }) {
  const [category, setCategory] = useState<HelpCategory>('All help');
  const resources = (communitySlug ? resourcesForCommunity(communitySlug) : communityResources).filter((resource) => (!organizationSlug || resource.organizationSlug === organizationSlug) && (category === 'All help' || resource.capabilities.includes(category)));
  return <>
    {!organizationSlug && <div className={journey.resourceToolbar}><CommunitySelect label="Filter cleanup help" value={category} options={helpCategories.map(item => ({value:item,label:item}))} onChange={value => setCategory(value as HelpCategory)} /></div>}
    <p className="sr-only" role="status">{resources.length} resources shown</p>
    <div className={styles.resourceList}>{resources.map((resource) => <article className={styles.resource} key={resource.id} id={resource.id}>
      <span className={styles.resourceIcon} aria-hidden="true">{resource.id === 'adopt-a-stream' ? <IoWaterOutline /> : resource.id === 'mountaintrue' ? <IoLeafOutline /> : <IoPeopleOutline />}</span>
      <div className={styles.resourceCopy}><h3><Link href={`/organizations/${resource.organizationSlug}#${resource.id}`}>{resource.name}</Link></h3><p className={styles.caption}>{resource.serviceArea}</p><p>{resource.description}</p><p className={styles.availability}>{resource.availability}</p>{resource.nextStep && <p><strong>Next step:</strong> {resource.nextStep}</p>}</div>
      <a data-community-resource={resource.id} className={styles.textLink} href={resource.href} target="_blank" rel="noopener noreferrer">{resource.action}</a>
    </article>)}</div>
    <p className={styles.directoryNote}>These organizations are independent of Litterbugs.</p>
  </>;
}

function subscribeSaved(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(COMMUNITY_SAVED_EVENT, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(COMMUNITY_SAVED_EVENT, callback); };
}
const serverSavedSnapshot = () => false;
export function SaveCommunity({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const snapshot = useCallback(() => {
    try { return communityIsSaved(window.localStorage, slug); } catch { return false; }
  }, [slug]);
  const saved = useSyncExternalStore(subscribeSaved, snapshot, serverSavedSnapshot);
  const [message, setMessage] = useState('');
  function toggle() {
    try {
      setCommunitySaved(window.localStorage, slug, !saved);
      window.dispatchEvent(new Event(COMMUNITY_SAVED_EVENT));
      trackCommunityEngagement(saved ? 'community_unsaved' : 'community_saved', { community_id: slug });
      setMessage(saved ? `${name} removed from saved communities.` : `${name} saved in this browser.`);
    } catch { setMessage('Couldn’t update your saved community. Please try again.'); }
  }
  return <><button type="button" className={styles.secondary} onClick={() => { setMessage(''); setOpen(true); }}>{saved && <IoCheckmarkOutline aria-hidden="true" />}{saved ? 'Community saved' : 'Save community'}</button>{open && <ModalShell label="Save community" onClose={() => setOpen(false)} className={styles.dialog}>
    <IoPeopleOutline className={styles.dialogIcon} aria-hidden="true" /><h2>Save {name}.</h2><p>Bookmark this community in this browser so you can find it again. This does not subscribe you to emails or sync across devices.</p><button className={styles.primary} type="button" onClick={toggle}>{saved ? 'Remove saved community' : 'Save community'}</button><p role="status">{message}</p>
  </ModalShell>}</>;
}

export function SavedCommunities({ communities }: { communities: { slug: string; href: string; name: string }[] }) {
  const snapshot = useCallback(() => {
    try { return communities.filter(community => communityIsSaved(window.localStorage, community.slug)).map(community => community.slug).join('|'); }
    catch { return ''; }
  }, [communities]);
  const saved = useSyncExternalStore(subscribeSaved, snapshot, () => '');
  if (!saved) return null;
  const slugs = saved.split('|');
  return <nav aria-label="Saved communities" className={styles.actions}><span>Saved in this browser:</span>{communities.filter(community => slugs.includes(community.slug)).map(community => <Link className={styles.textLink} key={community.slug} href={community.href}>{community.name}</Link>)}</nav>;
}
