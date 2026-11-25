'use client';
/* eslint-disable @next/next/no-img-element -- Local preview assets; no production reads or writes. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { IoArrowBack, IoArrowForward, IoCheckmark, IoChevronDown, IoChevronForward, IoClose, IoExpandOutline, IoHeart, IoHeartOutline, IoImageOutline, IoLocationOutline, IoMapOutline, IoShareOutline, IoTimeOutline } from 'react-icons/io5';
import styles from './preview.module.css';

export type Scene = 'cleaned' | 'report' | 'review' | 'active' | 'history' | 'duplicate';
type View = 'app' | 'web';
const ASSET = '/dev-review-preview/site-history';
const TITLE = 'Litter along Greenway Trail';
const PLACE = 'Boone, North Carolina';
const SCENES: { id: Scene; label: string }[] = [
  { id: 'cleaned', label: 'Cleaned site' }, { id: 'report', label: 'Report new litter' },
  { id: 'review', label: 'Photo review' }, { id: 'active', label: 'Needs a cleanup' },
  { id: 'history', label: 'Cleanup history' }, { id: 'duplicate', label: 'Already reported' },
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

export function SiteHistoryPreview({ initialScene, initialView }: { initialScene: Scene; initialView: View }) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [view, setView] = useState<View>(initialView);
  const [reopened, setReopened] = useState(initialScene === 'active' || initialScene === 'duplicate');
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
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [scene]);
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
    if (next === 'active' || next === 'duplicate') { setReopened(true); setPending(false); }
  }
  function reset() {
    setScene('cleaned'); setReopened(false); setPending(false); setPhoto(''); setDetails('');
    setPhotoSide('after'); setExpanded(null); setFormError(''); setOutsideNotice(''); setLikedPhotos({});
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) { setFormError('Add a photo to submit this report.'); return; }
    setPending(true); setReopened(false); setScene('review'); setFormError('');
  }
  function approve() { setPending(false); setReopened(true); setScene('active'); }
  function openHistory() { setExpanded(null); setScene('history'); }
  function closeHistory() { setScene(reopened ? 'active' : 'cleaned'); }
  const active = scene === 'active' || (scene === 'history' && reopened);
  const photoKey = active ? 'new-report' : photoSide;
  const liked = Boolean(likedPhotos[photoKey]);
  const heartCount = (active ? 0 : photoSide === 'after' ? 8 : 3) + (liked ? 1 : 0);
  const pageTitle = scene === 'history' ? 'Cleanup history' : scene === 'report' ? 'Report new litter' : scene === 'review' ? 'Report status' : 'Site details';

  const product = <>
    <header className={styles.appHeader}>
      <button aria-label="Back" className={styles.iconButton} onClick={() => scene === 'history' ? closeHistory() : scene === 'report' || scene === 'duplicate' ? setScene(reopened ? 'active' : 'cleaned') : setOutsideNotice('The map opens here in the existing app.')}><IoArrowBack /></button>
      <strong>{pageTitle}</strong>
      <button aria-label="Share site" className={styles.iconButton} onClick={() => setOutsideNotice('The same site link keeps its cleanup history. Sharing is simulated in this preview.')}><IoShareOutline /></button>
    </header>
    <div ref={body} className={styles.productBody}>
      {(scene === 'cleaned' || scene === 'active') && <>
        <div className={styles.siteLayout}>
          <div className={styles.hero}>
            <img src={active ? photo || `${ASSET}/before.jpg` : `${ASSET}/${photoSide}.jpg`} alt={active ? 'New litter at the site' : photoSide === 'after' ? 'Site after the latest cleanup' : 'Litter before the latest cleanup'} />
            <span className={`${styles.photoStatus} ${active ? styles.needs : styles.cleaned}`}><Bug kind={active ? 'ladybug' : 'butterfly'} size={18} />{active ? 'Needs a cleanup' : 'Cleaned'}</span>
            <button className={styles.expandPhoto} aria-label="Expand site photo" onClick={() => setLightbox(active ? photo || `${ASSET}/before.jpg` : `${ASSET}/${photoSide}.jpg`)}><IoExpandOutline /></button>
            {!active && <div className={styles.photoSwitch} aria-label="Latest cleanup photos">{(['before', 'after'] as const).map(side => <button key={side} aria-pressed={photoSide === side} onClick={() => setPhotoSide(side)}>{side === 'before' ? 'Before' : 'After'}</button>)}</div>}
            <button className={styles.heart} aria-label={liked ? 'Remove photo heart' : 'Heart photo'} aria-pressed={liked} onClick={() => setLikedPhotos(current => ({ ...current, [photoKey]: !liked }))}>{liked ? <IoHeart /> : <IoHeartOutline />}<span>{heartCount}</span></button>
          </div>
          <div className={styles.siteInfo}>
            <h1>{TITLE}</h1><p className={styles.location}><IoLocationOutline />{PLACE}</p>
            {active ? <>
              <p className={styles.observed}>New litter reported November 24, 2026</p>
              <div className={styles.fundSummary}><Bug kind="bee" size={24} /><strong>$0</strong><span>cleanup fund</span></div>
              <div className={styles.actionPair}>
                <button className={styles.fundButton} onClick={() => setOutsideNotice('Fund uses the existing contribution flow. Earlier cleanup funds and payouts are not reused.')}><Bug kind="bee" />Fund</button>
                <button className={styles.cleanButton} onClick={() => setOutsideNotice('Clean uses the existing volunteer or funded cleanup claim flow, with its usual safety checks.')}><Bug kind="butterfly" />Clean</button>
              </div>
            </> : <>
              <div className={styles.completed}><div className={styles.completedTitle}><Bug kind="butterfly" /><strong>Cleaned November 17, 2026</strong></div>
                <div className={styles.byline}><Avatar>M</Avatar><span>Cleaned by <strong>Morgan</strong></span></div>
                <div className={styles.cleanupFacts}><span><strong>4</strong> bags</span><span><strong>27 lb</strong> removed</span><span><strong>1 hr</strong></span></div>
                <p className={styles.paid}><Bug kind="bee" size={17} />$35 paid from the cleanup fund</p>
              </div>
              {pending ? <div className={styles.pendingInline}><IoTimeOutline />New report under review<button onClick={() => setScene('review')}>View</button></div>
                : <button className={styles.reportAgain} onClick={() => { setScene('report'); setOutsideNotice(''); }}><Bug kind="ladybug" size={19} />Needs cleaning again<IoArrowForward /></button>}
            </>}
          </div>
        </div>
        <button className={styles.historyLink} onClick={openHistory}><span className={styles.historyIcon}><IoTimeOutline /></span><span><strong>Cleanup history</strong><small>2 cleanups · Since September 2026</small></span><IoChevronForward /></button>
      </>}

      {scene === 'report' && <form className={styles.reportForm} onSubmit={submit}>
        <span className={styles.formBug}><Bug kind="ladybug" size={34} /></span><h1>Needs cleaning again</h1>
        <div className={styles.siteStrip}><IoLocationOutline /><div><strong>{TITLE}</strong><span>{PLACE}</span></div></div>
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
        <div className={styles.submittedPhoto}><img src={photo || `${ASSET}/before.jpg`} alt="Submitted litter photo" /><div><strong>{TITLE}</strong><span>Reported November 24, 2026</span></div></div>
        <button className={styles.primary} onClick={() => setScene('cleaned')}>View site</button>
        <button className={styles.textButton} onClick={openHistory}>Cleanup history<IoChevronForward /></button>
      </div>}

      {scene === 'history' && <section className={styles.history}>
        <h1>Cleanup history</h1><p className={styles.historyPlace}>{TITLE}</p>
        <div className={styles.historySummary}><Bug kind="butterfly" /><strong>2 cleanups</strong><span>6 bags removed</span></div>
        <ol className={styles.timeline}>
          {reopened && <li className={styles.newEvent}><span className={styles.eventDot}><Bug kind="ladybug" size={17} /></span><time>November 24, 2026</time><strong>New litter reported</strong><p>By Jamie · Needs a cleanup</p><button className={styles.textButton} onClick={() => setScene('active')}>View current report<IoArrowForward /></button></li>}
          {CLEANUPS.map(cleanup => <li key={cleanup.id}><span className={`${styles.eventDot} ${styles.cleanDot}`}><IoCheckmark /></span>
            <button className={styles.historyEntry} aria-expanded={expanded === cleanup.id} onClick={() => setExpanded(expanded === cleanup.id ? null : cleanup.id)}>
              <span><time>{cleanup.date}</time><strong>Cleaned by {cleanup.name}</strong><small>{cleanup.bags} bags · {cleanup.weight} · {cleanup.paid ? `${cleanup.paid} paid` : 'Volunteer cleanup'}</small></span><IoChevronDown className={expanded === cleanup.id ? styles.rotated : ''} />
            </button>
            {expanded === cleanup.id && <div className={styles.historyDetail}><PhotoPair date={cleanup.date} onExpand={setLightbox} /><p>{cleanup.note}</p>{cleanup.paid && <div className={styles.pastFunding}><Bug kind="bee" size={18} /><span><strong>{cleanup.paid} paid</strong><small>3 funders · Includes an anonymous donor</small></span></div>}</div>}
          </li>)}
          <li className={styles.firstEvent}><span className={styles.smallDot} /><time>September 10, 2026</time><strong>First reported</strong></li>
        </ol>
      </section>}

      {scene === 'duplicate' && <section className={styles.duplicate}>
        <span className={styles.formBug}><Bug kind="ladybug" size={38} /></span><h1>This site already needs a cleanup</h1>
        <div className={styles.submittedPhoto}><img src={`${ASSET}/before.jpg`} alt="Current report photo" /><div><strong>{TITLE}</strong><span>Reported November 24, 2026</span></div></div>
        <button className={styles.primary} onClick={() => { setReopened(true); setScene('active'); }}>View current report</button>
        <button className={styles.textButton} onClick={openHistory}>Cleanup history<IoChevronForward /></button>
      </section>}
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
          {scene === 'report' && <button onClick={() => { setPhoto(`${ASSET}/before.jpg`); setDetails('Bottles and food wrappers have collected beside the trail again.'); }}>Use sample photo & details</button>}
          {(scene === 'review' || pending && scene === 'cleaned') && <button onClick={approve}>Simulate passed photo review<IoArrowForward /></button>}
          <span role="status">{outsideNotice || 'Prototype only · No live reports, uploads or payments'}</span>
        </div>
        <div className={`${styles.stage} ${view === 'web' ? styles.webStage : ''}`}>
          {view === 'app' ? <div className={styles.phone}><div className={styles.phoneStatus} aria-hidden><strong>9:41</strong><span /><b>▮▮▮ ▰</b></div><div className={styles.screen}>{product}</div><div className={styles.homeBar} aria-hidden /></div>
            : <div className={styles.website}><header className={styles.webHeader}><Logo /><nav><span><IoMapOutline />Open map</span><span>Report</span><span>Donate</span><span>Earn</span></nav><Avatar>J</Avatar></header><div className={`${styles.screen} ${styles.screenWeb}`}>{product}</div></div>}
        </div>
        <details className={styles.designNotes}><summary>Recommendation & research<IoChevronDown /></summary><div>
          <h3>Keep the site. Start a new cleanup.</h3><p>One map location, with a fresh report, photos and cleanup fund each time litter returns. Earlier cleanups keep their photos, cleaner credit, donations and payouts.</p>
          <ul><li><strong>New evidence first.</strong> A submitted report follows the photo review before changing the public site status.</li><li><strong>One current report.</strong> If someone already reported it, open that report instead of creating a second active pin.</li><li><strong>History stays visible.</strong> Expand a dated cleanup to see its own before/after photos and result.</li></ul>
          <p>References: <a href="https://www.fixmystreet.com/faq" target="_blank" rel="noreferrer">FixMyStreet</a>, <a href="https://dev.seeclickfix.com/v2/issues/changing_status/" target="_blank" rel="noreferrer">SeeClickFix</a>, <a href="https://refero.design/pages/bfd66d37-7929-45e7-943b-c5b974e05f45" target="_blank" rel="noreferrer">Aboard activity</a>, <a href="https://refero.design/flows/11982" target="_blank" rel="noreferrer">Pool reporting flow</a>, <a href="https://refero.design/screens/404a1fa0-01b9-4274-aea3-4975df2aabef" target="_blank" rel="noreferrer">Google Maps photo history</a>.</p>
          <small>Photos come from an existing public Litterbugs report. Names, dates, stats and repeated cleanup events here are illustrative. The app view is a browser prototype, not an installed native update.</small>
        </div></details>
      </section>
    </div>
    {lightbox && <dialog ref={dialog} className={styles.lightbox} aria-label="Site photo" onCancel={event => { event.preventDefault(); setLightbox(null); }}><button className={styles.iconButton} aria-label="Close full photo" onClick={() => setLightbox(null)}><IoClose /></button><img src={lightbox} alt="Full site photo" /></dialog>}
  </main>;
}
