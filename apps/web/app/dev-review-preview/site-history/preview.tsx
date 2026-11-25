'use client';
/* eslint-disable @next/next/no-img-element -- Local preview assets; no production reads or writes. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { IoArrowBack, IoArrowForward, IoCheckmark, IoChevronDown, IoChevronForward, IoClose, IoExpandOutline, IoHeart, IoHeartOutline, IoImageOutline, IoLocationOutline, IoMapOutline, IoShareOutline, IoTimeOutline } from 'react-icons/io5';
import styles from './preview.module.css';

export type Scene = 'cleaned' | 'report' | 'review' | 'active' | 'timeline' | 'duplicate';
type View = 'app' | 'web';
const ASSET = '/dev-review-preview/site-history';
const TITLE = 'Litter along Greenway Trail';
const PLACE = 'Boone, North Carolina';
const SCENES: { id: Scene; label: string }[] = [
  { id: 'cleaned', label: 'Cleaned site' }, { id: 'report', label: 'Report new litter' },
  { id: 'review', label: 'Photo review' }, { id: 'active', label: 'Needs a cleanup' },
  { id: 'timeline', label: 'Timeline' }, { id: 'duplicate', label: 'Already reported notice' },
];
const CLEANUPS = [
  { id: 'nov', date: 'November 17, 2026', name: 'Morgan', initials: 'M', bags: '4', weight: '27 lb', time: '1 hr', paid: '$35', note: 'Picked up bottles, cans and litter along the wooded edge of the trail.' },
  { id: 'sep', date: 'September 12, 2026', name: 'Casey', initials: 'C', bags: '2', weight: '12 lb', time: '45 min', paid: null, note: 'Cleared the trail entrance and the edge of the path.' },
];

function Bug({ kind, size = 22 }: { kind: 'ladybug' | 'butterfly' | 'bee'; size?: number }) {
  return <img className={styles.bug} src={`/brand/bugs/${kind}.png`} alt="" aria-hidden width={size} height={size} />;
}
function Logo() { return <img className={styles.logo} src="/brand/litterbugs-logo.png" alt="Litterbugs" />; }
function Avatar({ children }: { children: ReactNode }) { return <span className={styles.avatar}>{children}</span>; }
function PhotoPair({ date, onExpand }: { date: string; onExpand: (url: string) => void }) {
  return <div className={styles.photoPair}>{(['before', 'after'] as const).map(side => <button key={side} onClick={() => onExpand(`${ASSET}/${side}.jpg`)} aria-label={`View ${side} photo from ${date}`}>
    <img src={`${ASSET}/${side}.jpg`} alt={`${side === 'before' ? 'Litter before' : 'Site after'} cleanup`} /><span>{side === 'before' ? 'Before' : 'After'}</span>
  </button>)}</div>;
}


type Round = { id: string; reporter: string; start: string; date: string; cleaned: boolean; events: { date: string; label: string; cleanupId?: string }[] };
const PAST_ROUNDS: Round[] = [
  { id: 'sep', reporter: 'Alex', start: 'September 10, 2026', date: 'Sep 10–12, 2026', cleaned: true, events: [
    { date: 'September 10, 2026', label: 'Reported by Alex' },
    { date: 'September 11, 2026', label: 'Cleanup claimed by Casey' },
    { date: 'September 12, 2026', label: 'Cleaned up by Casey', cleanupId: 'sep' },
  ] },
  { id: 'nov', reporter: 'Riley', start: 'November 15, 2026', date: 'Nov 15–17, 2026', cleaned: true, events: [
    { date: 'November 15, 2026', label: 'Reported by Riley' },
    { date: 'November 15, 2026 · 10:12 AM UTC', label: '$10.00 donated by Alex' },
    { date: 'November 15, 2026 · 11:40 AM UTC', label: '$20.00 donated anonymously' },
    { date: 'November 15, 2026 · 2:08 PM UTC', label: '$5.00 donated by Taylor' },
    { date: 'November 16, 2026', label: 'Cleanup claimed by Morgan' },
    { date: 'November 17, 2026', label: 'Cleaned up by Morgan', cleanupId: 'nov' },
  ] },
];
function SiteTimeline({ reopened, reporter, openRounds, onToggleRound, expandedEvidence, onToggleEvidence, onExpand }: {
  reopened: boolean; reporter: string; openRounds: Record<string, boolean>;
  onToggleRound: (id: string) => void; expandedEvidence: string | null;
  onToggleEvidence: (id: string) => void; onExpand: (url: string) => void;
}) {
  const rounds: Round[] = [...PAST_ROUNDS, ...(reopened ? [{ id: 'current', reporter, start: 'November 24, 2026', date: 'Nov 24, 2026', cleaned: false, events: [{ date: 'November 24, 2026', label: `Reported by ${reporter}` }] }] : [])];
  return <section className={styles.siteTimeline} aria-labelledby="site-timeline-heading">
    <div className={styles.timelineHeading}><h2 id="site-timeline-heading">Timeline</h2><span>2 cleanups · 6 bags removed</span></div>
    <ol className={styles.reportRounds}>{rounds.map(round => <li key={round.id}>
      <button className={styles.roundToggle} aria-expanded={Boolean(openRounds[round.id])} onClick={() => onToggleRound(round.id)}>
        <span><strong>{round.date}</strong><small>Reported by {round.reporter}</small></span>
        <span className={round.cleaned ? styles.roundCleaned : styles.roundCurrent}>{round.cleaned ? 'Cleaned' : 'Current report'}</span>
        <IoChevronDown className={openRounds[round.id] ? styles.rotated : ''} />
      </button>
      {openRounds[round.id] && <ol className={styles.eventList}>{round.events.map((event, index) => {
        const cleanup = CLEANUPS.find(item => item.id === event.cleanupId);
        return <li key={`${round.id}-${index}`}><time>{event.date}</time>
          {cleanup ? <>
            <button className={styles.cleanupEvent} aria-expanded={expandedEvidence === cleanup.id} onClick={() => onToggleEvidence(cleanup.id)}><span>{event.label}</span><IoChevronDown className={expandedEvidence === cleanup.id ? styles.rotated : ''} /></button>
            {expandedEvidence === cleanup.id && <div className={styles.eventEvidence}>
              <PhotoPair date={cleanup.date} onExpand={onExpand} />
              <p>{cleanup.note}</p><p className={styles.eventFacts}>{cleanup.bags} bags · {cleanup.weight} · {cleanup.time}</p>
              <p className={styles.paid}>{cleanup.paid ? <><Bug kind="bee" size={17} />{cleanup.paid} paid from the cleanup fund</> : 'Volunteer cleanup'}</p>
            </div>}
          </> : <span className={styles.eventLabel}>{event.label}</span>}
        </li>;
      })}</ol>}
    </li>)}</ol>
  </section>;
}

export function SiteHistoryPreview({ initialScene, initialView }: { initialScene: Scene; initialView: View }) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [view, setView] = useState<View>(initialView);
  const [reopened, setReopened] = useState(initialScene === 'active' || initialScene === 'duplicate' || initialScene === 'timeline');
  const [currentReporter, setCurrentReporter] = useState(initialScene === 'duplicate' ? 'Taylor' : 'Jamie');
  const [concurrentReport, setConcurrentReport] = useState(false);
  const [openRounds, setOpenRounds] = useState<Record<string, boolean>>({ nov: true, current: true });
  const [pending, setPending] = useState(initialScene === 'review');
  const [photo, setPhoto] = useState('');
  const [details, setDetails] = useState('');
  const [photoSide, setPhotoSide] = useState<'before' | 'after'>('after');
  const [likedPhotos, setLikedPhotos] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [outsideNotice, setOutsideNotice] = useState('');
  const [formError, setFormError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const timelineSection = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const container = body.current, section = timelineSection.current;
    if (scene === 'timeline' && section && container) {
      if (view === 'app') container.scrollTo({ top: section.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop });
      else section.scrollIntoView({ block: 'start' });
    } else container?.scrollTo({ top: 0 });
  }, [scene, view]);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('screen', scene); url.searchParams.set('view', view);
    window.history.replaceState(null, '', url);
  }, [scene, view]);
  useEffect(() => () => { if (photo.startsWith('blob:')) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => { if (lightbox) dialog.current?.showModal(); }, [lightbox]);

  function selectScene(next: Scene) {
    setScene(next); setOutsideNotice(''); setFormError('');
    if (next === 'cleaned') { setReopened(false); setPending(false); }
    if (next === 'review') { setReopened(false); setPending(true); }
    if (next === 'active' || next === 'duplicate') { setReopened(true); setPending(false); setCurrentReporter(next === 'duplicate' ? 'Taylor' : 'Jamie'); }
    if (next === 'report') setConcurrentReport(false);
  }
  function reset() {
    setScene('cleaned'); setReopened(false); setPending(false); setPhoto(''); setDetails('');
    setCurrentReporter('Jamie'); setConcurrentReport(false); setOpenRounds({ nov: true, current: true });
    setPhotoSide('after'); setExpanded(null); setFormError(''); setOutsideNotice(''); setLikedPhotos({});
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) { setFormError('Add a photo to submit this report.'); return; }
    if (concurrentReport) { setCurrentReporter('Taylor'); setPending(false); setReopened(true); setScene('duplicate'); setFormError(''); return; }
    setCurrentReporter('Jamie'); setPending(true); setReopened(false); setScene('review'); setFormError('');
  }
  function approve() { setCurrentReporter('Jamie'); setPending(false); setReopened(true); setScene('active'); }
  function openTimeline() { setScene('timeline'); }
  const active = scene === 'active' || scene === 'duplicate' || (scene === 'timeline' && reopened);
  const activePhoto = currentReporter === 'Taylor' ? `${ASSET}/before.jpg` : photo || `${ASSET}/before.jpg`;
  const photoKey = active ? 'new-report' : photoSide;
  const liked = Boolean(likedPhotos[photoKey]);
  const heartCount = (active ? 0 : photoSide === 'after' ? 8 : 3) + (liked ? 1 : 0);
  const pageTitle = scene === 'report' ? 'Report new litter' : scene === 'review' ? 'Report status' : 'Site details';

  const product = <>
    <header className={styles.appHeader}>
      <button aria-label="Back" className={styles.iconButton} onClick={() => scene === 'report' ? setScene(reopened ? 'active' : 'cleaned') : scene === 'timeline' ? setScene(reopened ? 'active' : 'cleaned') : setOutsideNotice('The map opens here in the existing app.')}><IoArrowBack /></button>
      <strong>{pageTitle}</strong>
      <button aria-label="Share site" className={styles.iconButton} onClick={() => setOutsideNotice('The same site link keeps its Timeline. Sharing is simulated in this preview.')}><IoShareOutline /></button>
    </header>
    <div ref={body} className={styles.productBody}>
      {(['cleaned', 'active', 'timeline', 'duplicate'] as Scene[]).includes(scene) && <>
        {scene === 'duplicate' && <div className={styles.alreadyNotice} role="status"><IoCheckmark /><span>Taylor already reported new litter.</span><button aria-label="Dismiss already reported notice" onClick={() => setScene('active')}><IoClose /></button></div>}
        <div className={styles.siteLayout}>
          <div className={styles.hero}>
            <img src={active ? activePhoto : `${ASSET}/${photoSide}.jpg`} alt={active ? 'New litter at the site' : photoSide === 'after' ? 'Site after the latest cleanup' : 'Litter before the latest cleanup'} />
            <span className={`${styles.photoStatus} ${active ? styles.needs : styles.cleaned}`}><Bug kind={active ? 'ladybug' : 'butterfly'} size={18} />{active ? 'Needs a cleanup' : 'Cleaned'}</span>
            <button className={styles.expandPhoto} aria-label="Expand site photo" onClick={() => setLightbox(active ? activePhoto : `${ASSET}/${photoSide}.jpg`)}><IoExpandOutline /></button>
            {!active && <div className={styles.photoSwitch} aria-label="Latest cleanup photos">{(['before', 'after'] as const).map(side => <button key={side} aria-pressed={photoSide === side} onClick={() => setPhotoSide(side)}>{side === 'before' ? 'Before' : 'After'}</button>)}</div>}
            <button className={styles.heart} aria-label={liked ? 'Remove photo heart' : 'Heart photo'} aria-pressed={liked} onClick={() => setLikedPhotos(current => ({ ...current, [photoKey]: !liked }))}>{liked ? <IoHeart /> : <IoHeartOutline />}<span>{heartCount}</span></button>
          </div>
          <div className={styles.siteInfo}>
            <h1>{TITLE}</h1><p className={styles.location}><IoLocationOutline />{PLACE}</p>
            {active ? <>
              <div className={styles.reporterByline}><Avatar>{currentReporter[0]}</Avatar><span>Reported by <strong>{currentReporter}</strong><small>November 24, 2026</small></span></div>
              <div className={styles.fundSummary}><Bug kind="bee" size={24} /><strong>$0</strong><span>cleanup fund</span></div>
              <div className={styles.actionPair}>
                <button className={styles.fundButton} onClick={() => setOutsideNotice('Fund uses the existing contribution flow. Earlier cleanup funds and payouts are not reused.')}><Bug kind="bee" />Fund</button>
                <button className={styles.cleanButton} onClick={() => setOutsideNotice('Clean uses the existing volunteer or funded cleanup claim flow, with its usual safety checks.')}><Bug kind="butterfly" />Clean</button>
              </div>
            </> : <>
              <p className={styles.observed}>Reported by <strong>Riley</strong> · November 15, 2026</p>
              <div className={styles.completed}><div className={styles.completedTitle}><Bug kind="butterfly" /><strong>Cleaned November 17, 2026</strong></div>
                <div className={styles.byline}><Avatar>M</Avatar><span>Cleaned by <strong>Morgan</strong></span></div>
                <div className={styles.cleanupFacts}><span><strong>4</strong> bags</span><span><strong>27 lb</strong> removed</span><span><strong>1 hr</strong></span></div>
                <p className={styles.paid}><Bug kind="bee" size={17} />$35 paid from the cleanup fund</p>
              </div>
              {pending ? <div className={styles.pendingInline}><IoTimeOutline />New report under review<button onClick={() => setScene('review')}>View</button></div>
                : <button className={styles.reportAgain} onClick={() => { setScene('report'); setConcurrentReport(false); setOutsideNotice(''); }}><Bug kind="ladybug" size={19} />Needs cleaning again<IoArrowForward /></button>}
            </>}
          </div>
        </div>
        <button className={styles.historyLink} onClick={openTimeline}><span className={styles.historyIcon}><IoTimeOutline /></span><span><strong>Cleaned twice</strong><small>View timeline</small></span><IoChevronForward /></button>
        <div ref={timelineSection} className={styles.timelineAnchor}><SiteTimeline reopened={reopened} reporter={currentReporter} openRounds={openRounds} onToggleRound={id => setOpenRounds(current => ({ ...current, [id]: !current[id] }))} expandedEvidence={expanded} onToggleEvidence={id => setExpanded(expanded === id ? null : id)} onExpand={setLightbox} /></div>
      </>}

      {scene === 'report' && <form className={styles.reportForm} onSubmit={submit}>
        <span className={styles.formBug}><Bug kind="ladybug" size={34} /></span><h1>Needs cleaning again</h1>
        <div className={styles.siteStrip}><IoLocationOutline /><div><strong>{TITLE}</strong><span>{PLACE}</span></div></div>
        <div className={styles.reportingAs}><Avatar>J</Avatar><span>Jamie</span><small>Reporter</small></div>
        <label className={styles.fieldLabel}>Photos <span>Required</span></label>
        <input ref={fileInput} className={styles.fileInput} type="file" accept="image/*" aria-label="Add new litter photo" onChange={event => { const file = event.target.files?.[0]; if (file) { setPhoto(URL.createObjectURL(file)); setFormError(''); } }} />
        {photo ? <div className={styles.attachment}><img src={photo} alt="Attached new litter photo" /><button type="button" aria-label="Remove attached photo" className={styles.iconButton} onClick={() => setPhoto('')}><IoClose /></button></div>
          : <button type="button" className={styles.addPhotos} onClick={() => fileInput.current?.click()}><IoImageOutline /><strong>Add photos</strong></button>}
        <label className={styles.fieldLabel} htmlFor="new-litter-details">Details <span>Optional</span></label>
        <textarea id="new-litter-details" value={details} onChange={event => setDetails(event.target.value)} rows={3} />
        {formError && <p className={styles.error} role="alert">{formError}</p>}
        <button className={styles.primary} type="submit" disabled={!photo}>Submit report</button>
      </form>}

      {scene === 'review' && <div className={styles.review}>
        <span className={styles.receivedIcon}><IoCheckmark /></span><h1>Report received</h1>
        <p className={styles.reviewStatus}><IoTimeOutline />Photo review in progress</p>
        <div className={styles.submittedPhoto}><img src={photo || `${ASSET}/before.jpg`} alt="Submitted litter photo" /><div><strong>{TITLE}</strong><span>Reported by Jamie · November 24, 2026</span></div></div>
        <button className={styles.primary} onClick={() => setScene('cleaned')}>View site</button>
        <button className={styles.textButton} onClick={openTimeline}>View timeline<IoChevronForward /></button>
      </div>}

    </div>
  </>;

  return <main className={styles.preview}>
    <header className={styles.previewHeader}><Logo /><div><strong>Site history</strong><span>Local preview · Sample content</span></div><button className={styles.reset} onClick={reset}>Reset preview</button></header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar}><h2>Preview</h2><nav aria-label="Preview states">{SCENES.map((item, index) => <button key={item.id} aria-current={scene === item.id ? 'step' : undefined} onClick={() => selectScene(item.id)}><span>{index + 1}</span>{item.label}</button>)}</nav>
        <div className={styles.researchMini}><strong>One site. Every cleanup.</strong><p>The current condition changes. Past cleanups stay in its history.</p></div>
      </aside>
      <section className={styles.previewArea} aria-label="Interactive preview">
        <div className={styles.toolbar}><h2>{SCENES.find(item => item.id === scene)?.label}</h2><div className={styles.viewToggle} aria-label="Preview platform">{(['app', 'web'] as const).map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item === 'app' ? 'App' : 'Website'}</button>)}</div></div>
        <div className={styles.simulationControls}>
          {scene === 'report' && <><button onClick={() => { setPhoto(`${ASSET}/before.jpg`); setDetails('Bottles and food wrappers have collected beside the trail again.'); }}>Use sample photo & details</button><button aria-pressed={concurrentReport} onClick={() => setConcurrentReport(!concurrentReport)}>{concurrentReport ? 'Another report has arrived' : 'Simulate another report arriving'}</button></>}
          {(scene === 'review' || pending && scene === 'cleaned') && <button onClick={approve}>Simulate passed photo review<IoArrowForward /></button>}
          <span role="status">{outsideNotice || 'Prototype only · No live reports, uploads or payments'}</span>
        </div>
        <div className={`${styles.stage} ${view === 'web' ? styles.webStage : ''}`}>
          {view === 'app' ? <div className={styles.phone}><div className={styles.phoneStatus} aria-hidden><strong>9:41</strong><span /><b>▮▮▮ ▰</b></div><div className={styles.screen}>{product}</div><div className={styles.homeBar} aria-hidden /></div>
            : <div className={styles.website}><header className={styles.webHeader}><Logo /><nav><span><IoMapOutline />Open map</span><span>Report</span><span>Donate</span><span>Earn</span></nav><Avatar>J</Avatar></header><div className={`${styles.screen} ${styles.screenWeb}`}>{product}</div></div>}
        </div>
        <details className={styles.designNotes}><summary>Recommendation & research<IoChevronDown /></summary><div>
          <h3>Keep the site and its Timeline.</h3><p>One map location, with a fresh report, photos and cleanup fund each time litter returns. Earlier cleanups keep their photos, cleaner credit, donations and payouts.</p>
          <ul><li><strong>New evidence first.</strong> A submitted report follows the photo review before changing the public site status.</li><li><strong>One current report.</strong> If someone already reported it, open that report instead of creating a second active pin.</li><li><strong>One Timeline.</strong> Reporting, donations, claiming and cleanup stay together, grouped by report. Expand a cleanup event to see its photos and result.</li></ul>
          <p>References: <a href="https://www.fixmystreet.com/faq" target="_blank" rel="noreferrer">FixMyStreet</a>, <a href="https://dev.seeclickfix.com/v2/issues/changing_status/" target="_blank" rel="noreferrer">SeeClickFix</a>, <a href="https://refero.design/pages/bfd66d37-7929-45e7-943b-c5b974e05f45" target="_blank" rel="noreferrer">Aboard activity</a>, <a href="https://refero.design/flows/11982" target="_blank" rel="noreferrer">Pool reporting flow</a>, <a href="https://refero.design/screens/404a1fa0-01b9-4274-aea3-4975df2aabef" target="_blank" rel="noreferrer">Google Maps photo history</a>.</p>
          <small>Photos come from an existing public Litterbugs report. Names, dates, stats and repeated cleanup events here are illustrative. The app view is a browser prototype, not an installed native update.</small>
        </div></details>
      </section>
    </div>
    {lightbox && <dialog ref={dialog} className={styles.lightbox} aria-label="Site photo" onCancel={event => { event.preventDefault(); setLightbox(null); }}><button className={styles.iconButton} aria-label="Close full photo" onClick={() => setLightbox(null)}><IoClose /></button><img src={lightbox} alt="Full site photo" /></dialog>}
  </main>;
}
