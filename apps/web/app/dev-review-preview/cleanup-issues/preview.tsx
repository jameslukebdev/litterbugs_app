'use client';
/* eslint-disable @next/next/no-img-element -- Existing local assets in a development-only prototype. */
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { IoArrowBack, IoArrowForward, IoCheckmark, IoCheckmarkCircleOutline, IoChevronDown, IoChevronForward, IoClose, IoEllipsisHorizontal, IoFlagOutline, IoImageOutline, IoLocationOutline, IoLockClosedOutline, IoNotificationsOutline, IoPencilOutline, IoReturnUpBackOutline, IoShieldCheckmarkOutline, IoTimeOutline } from 'react-icons/io5';
import s from './preview.module.css';

export type Stage = 'cleanup' | 'issue' | 'inbox' | 'reporter' | 'edit' | 'review' | 'site';
type Reason = 'access' | 'unsafe' | 'moved' | 'gone' | 'other';
const TITLE = 'Litter along Greenway Trail';
const PHOTO = '/dev-review-preview/site-history/before.jpg';
const ORIGINAL = 'Bottles, cans and paper along the wooded edge of the trail.';
const EXAMPLE_UPDATE = 'Use the public entrance beside the bridge, then follow the marked trail to the creek.';
const REASONS: { id: Reason; label: string; note: string }[] = [
  { id: 'access', label: 'Can’t reach the litter', note: 'The gate by the parking lot is locked. Is there another public entrance?' },
  { id: 'unsafe', label: 'Unsafe to clean', note: 'There are needles mixed in with the litter beside the path.' },
  { id: 'moved', label: 'Litter has moved', note: 'The pile is no longer beside the sign. There is litter farther downstream.' },
  { id: 'gone', label: 'No litter here', note: 'I checked the path and creek bank but couldn’t find the reported litter.' },
  { id: 'other', label: 'Something else', note: 'I need a little more information about this site before I can start.' },
];
const STAGES: { id: Stage; label: string; role: string }[] = [
  { id: 'cleanup', label: 'Cleaner’s report', role: 'Cleaner' }, { id: 'issue', label: 'Report an issue', role: 'Cleaner' },
  { id: 'inbox', label: 'Reporter notification', role: 'Reporter' }, { id: 'reporter', label: 'Review the issue', role: 'Reporter' },
  { id: 'edit', label: 'Update a funded report', role: 'Reporter' }, { id: 'review', label: 'Review the update', role: 'Cleaner' },
  { id: 'site', label: 'Public report & Timeline', role: 'Visitor' },
];
function Bug({ kind = 'ladybug' }: { kind?: 'ladybug' | 'bee' | 'butterfly' | 'flower' }) { return <img className={s.bug} src={`/brand/bugs/${kind}.png`} alt="" aria-hidden width={22} height={22} />; }
function Avatar({ letter, mint = false }: { letter: string; mint?: boolean }) { return <span className={`${s.avatar} ${mint ? s.mintAvatar : ''}`}>{letter}</span>; }
function Tag({ children, kind = 'amber' }: { children: ReactNode; kind?: 'amber' | 'mint' | 'lilac' | 'danger' | 'available' }) { return <span className={`${s.tag} ${s[kind]}`}>{children}</span>; }
function Fund() { return <span className={s.fund}><Bug kind="bee" />$35 cleanup fund</span>; }

export function CleanupIssuesPreview({ initialStage, initialView }: { initialStage: Stage; initialView: 'app' | 'web' }) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [view, setView] = useState(initialView);
  const [entry, setEntry] = useState<'menu' | 'inline'>('menu');
  const [menu, setMenu] = useState(false);
  const [reason, setReason] = useState<Reason>('access');
  const [details, setDetails] = useState('');
  const [keep, setKeep] = useState(true);
  const [sent, setSent] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [closure, setClosure] = useState(false);
  const [description, setDescription] = useState(ORIGINAL);
  const [access, setAccess] = useState('');
  const [originalPhoto, setOriginalPhoto] = useState(true);
  const [photos, setPhotos] = useState<{ id: string; src: string }[]>([]);
  const [issuePhoto, setIssuePhoto] = useState<string | null>(null);
  const [existingFlow, setExistingFlow] = useState<'photos' | 'giveback' | 'funding' | 'claim' | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);
  const selected = REASONS.find(row => row.id === reason)!;
  const needsTeam = ['unsafe', 'moved', 'gone'].includes(reason);
  const hasIssue = sent || !['cleanup', 'issue'].includes(stage);
  const paused = hasIssue && !resolved;
  const current = STAGES.find(row => row.id === stage)!;
  const note = details.trim() || selected.note;
  const newAccess = access.trim() || (reason === 'access' ? EXAMPLE_UPDATE : '');
  const changed = description !== ORIGINAL || !!access.trim() || photos.length > 0 || !originalPhoto;
  const photoCount = photos.length + Number(originalPhoto);
  const go = (next: Stage) => { setMenu(false); setExistingFlow(null); setStage(next); };
  useEffect(() => { body.current?.scrollTo({ top: 0 }); const url = new URL(window.location.href); url.searchParams.set('screen', stage); url.searchParams.set('view', view); window.history.replaceState({}, '', url); }, [stage, view]);
  useEffect(() => { if (!menu) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [menu]);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);
  const chooseReason = (id: Reason, fresh = false) => { setReason(id); if (fresh) { setDetails(''); setDescription(ORIGINAL); setAccess(''); setOriginalPhoto(true); setPhotos([]); setIssuePhoto(null); } setSent(false); setSaved(false); setResolved(false); setClosure(false); setKeep(!['unsafe', 'gone'].includes(id)); };
  function addPhotos(event: ChangeEvent<HTMLInputElement>, issue = false) {
    const files = [...(event.target.files ?? [])].filter(file => file.type.startsWith('image/'));
    const added = files.slice(0, issue ? 1 : Math.max(0, 3 - photoCount)).map(file => { const src = URL.createObjectURL(file); urls.current.push(src); return { src, id: src }; });
    if (issue) setIssuePhoto(added[0]?.src ?? null); else setPhotos(value => [...value, ...added]);
    event.target.value = '';
  }
  function reset() { setStage('cleanup'); setReason('access'); setDetails(''); setKeep(true); setSent(false); setSaved(false); setResolved(false); setClosure(false); setMenu(false); setDescription(ORIGINAL); setAccess(''); setOriginalPhoto(true); setPhotos([]); setIssuePhoto(null); setExistingFlow(null); }
  function issueCard(showUpdate = false) { return <section className={`${s.issueCard} ${reason === 'unsafe' ? s.safetyCard : ''}`}>
    <div className={s.byline}><Avatar letter="M" mint /><div><strong>Morgan</strong><small>Today · 11:20 AM</small></div><IoFlagOutline className={s.trailing} /></div>
    <h3>{selected.label}</h3><p>{note}</p>{issuePhoto && <img className={s.evidence} src={issuePhoto} alt="Cleaner’s attached site photo" />}
    {showUpdate && <button className={s.textAction} onClick={() => go('edit')}><IoPencilOutline />Update report<IoArrowForward /></button>}
  </section>; }
  function timeline() { return <section className={s.timeline}><div className={s.sectionHead}><h2>Timeline</h2><small>0 cleanups</small></div><ol>
    <li><time>November 24, 2026</time><p>Reported by Riley</p><details><summary>Original report<IoChevronDown /></summary><img className={s.originalThumb} src={PHOTO} alt="Original report, retained in history" /><p>{ORIGINAL}</p></details></li>
    <li><time>November 24, 2026</time><p>$10 donated by Alex</p><p>$20 donated anonymously</p><p>$5 donated by Taylor</p></li>
    <li><time>November 25, 2026</time><p>Cleanup claimed by Morgan</p></li>
    {hasIssue && <li><time>November 25, 2026</time><p>Update requested</p>{!keep && <p>Cleanup given back</p>}</li>}
    {(saved || resolved) && <li><time>November 25, 2026</time><p>Report updated by Riley</p><details><summary>View update<IoChevronDown /></summary><p>{description}</p><p>{newAccess}</p></details></li>}
    {resolved && <li><time>November 25, 2026</time><p>Issue resolved</p></li>}
  </ol></section>; }
  function content() {
    if (stage === 'cleanup') return <>
      <div className={s.photoHeading}><img src={PHOTO} alt="Litter along the wooded edge of the trail" /><span><Tag kind="mint">In progress</Tag></span></div>
      <div className={s.heading}><h1>{TITLE}</h1><p className={s.place}><IoLocationOutline />Boone, North Carolina</p><Fund /></div>
      <section className={s.claim}><div className={s.sectionHead}><div className={s.byline}><Bug kind="butterfly" /><strong>Your cleanup</strong></div>{entry === 'menu' && <div className={s.menuAnchor}>
        <button className={s.iconButton} aria-label="Cleanup options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(value => !value)}><IoEllipsisHorizontal /></button>
        {menu && <><button className={s.menuScrim} aria-label="Close cleanup options" onClick={() => setMenu(false)} /><div className={s.menu} role="menu"><button role="menuitem" onClick={() => go('issue')}><IoFlagOutline />Report an issue</button><button role="menuitem" onClick={() => { setMenu(false); setExistingFlow('giveback'); }}><IoReturnUpBackOutline />Give back cleanup</button></div></>}
      </div>}</div><p className={s.claimClock}><IoTimeOutline />{paused ? 'Claim clock paused' : 'Due tomorrow, 3:00 PM'}</p>
      {entry === 'inline' && <button className={s.utility} onClick={() => go('issue')}><IoFlagOutline />Report an issue</button>}
      {paused && <Tag>Update requested</Tag>}
      <button className={s.cleanButton} disabled={paused} onClick={() => setExistingFlow('photos')}>Add cleanup photos</button>
      </section>
      <section className={s.reportFacts}><h2>About this report</h2><p>{ORIGINAL}</p><div className={s.byline}><Avatar letter="R" /><div><small>Reported by</small><strong>Riley</strong></div></div></section>
    </>;
    if (stage === 'issue') return <div className={s.formContent}>
      {sent ? <><div className={s.successIcon}><IoCheckmarkCircleOutline /></div><h1>Reporter notified</h1><p className={s.stateLine}>{keep ? 'Your cleanup is paused.' : 'Cleanup given back.'}</p><Tag>Update requested</Tag><div className={s.notePreview}><strong>{selected.label}</strong><p>{note}</p></div><button className={s.primary} onClick={() => go('cleanup')}>Done</button></> : <>
        <h1>Report an issue</h1><fieldset className={s.reasonList}><legend className={s.srOnly}>Issue type</legend>{REASONS.map(row => <label key={row.id}><span>{row.label}</span><input type="radio" name="issue-reason" value={row.id} checked={reason === row.id} onChange={() => chooseReason(row.id)} /></label>)}</fieldset>
        <label className={s.field}>Details<textarea aria-label="Issue details" rows={3} value={details} onChange={event => setDetails(event.target.value)} /></label>
        <label className={s.photoUtility}><IoImageOutline />{issuePhoto ? 'Replace photo' : 'Add a photo'}<span>Optional</span><input type="file" accept="image/*" onChange={event => addPhotos(event, true)} /></label>{issuePhoto && <img className={s.evidence} src={issuePhoto} alt="Selected issue evidence" />}
        <fieldset className={s.choiceField}><legend>Your cleanup</legend><div>{[{ value: true, text: 'Keep it' }, { value: false, text: 'Give it back' }].map(choice => <label key={choice.text}><input type="radio" name="claim-choice" checked={keep === choice.value} onChange={() => setKeep(choice.value)} /><span>{choice.text}</span></label>)}</div></fieldset>
        <div className={s.consequence}><IoTimeOutline /><span>{keep ? 'Claim clock pauses until the issue is resolved.' : 'The site stays paused until the issue is resolved.'}</span></div>
        <button className={s.primary} disabled={!details.trim()} onClick={() => { setSent(true); setResolved(false); }}>Notify reporter</button>
      </>}
    </div>;
    if (stage === 'inbox') return <div className={s.formContent}><h1>Notifications</h1><p className={s.day}>Today</p><button className={s.notice} onClick={() => go('reporter')}><span className={s.noticeIcon}><IoFlagOutline /></span><span><strong>Your report needs an update</strong><span>Morgan reported an issue with {TITLE.toLowerCase()}.</span><small>Just now</small></span><span className={s.unread} /></button><div className={s.oldNotice}><IoCheckmarkCircleOutline /><span><strong>Your report was claimed</strong><span>Morgan claimed {TITLE.toLowerCase()}.</span><small>1 hour ago</small></span></div></div>;
    if (stage === 'reporter') return <div className={s.formContent}><div className={s.titleUtility}><h1>Your report</h1><button className={s.utility} onClick={() => go('edit')}><IoPencilOutline />Edit</button></div><h2 className={s.reportTitle}>{TITLE}</h2><Fund /><div className={s.statusRow}><Tag kind={resolved ? 'mint' : 'amber'}>{resolved ? 'Issue resolved' : closure ? 'Closure requested' : 'Update requested'}</Tag></div>
      {closure ? <section className={s.waiting}><IoShieldCheckmarkOutline /><h3>Awaiting Litterbugs review</h3><p>No cleanup completed</p><div className={s.fundLock}><IoLockClosedOutline /><span>Cleanup fund</span><strong>$35</strong></div></section> : <>{issueCard(true)}<button className={s.utility} onClick={() => setClosure(true)}>No cleanup needed<IoChevronForward /></button></>}
      <section className={s.retained}><h3>Report history</h3><details><summary>Original photos and description<IoChevronDown /></summary><img className={s.originalThumb} src={PHOTO} alt="Original report photo" /><p>{ORIGINAL}</p></details></section>
    </div>;
    if (stage === 'edit') return <div className={s.formContent}><h1>Update report</h1><div className={s.fundLock}><IoLockClosedOutline /><span>Cleanup fund</span><strong>$35</strong><small>3 contributions</small></div>
      <div className={s.field}><span>Photos</span><div className={s.editPhotos}>{originalPhoto && <div><img src={PHOTO} alt="Current original report photo" /><button aria-label="Remove original photo from current version" onClick={() => setOriginalPhoto(false)}><IoClose /></button></div>}{photos.map(photo => <div key={photo.id}><img src={photo.src} alt="New report photo" /><button aria-label="Remove new photo" onClick={() => setPhotos(value => value.filter(item => item.id !== photo.id))}><IoClose /></button></div>)}{photoCount < 3 && <label className={s.addPhoto}><IoImageOutline /><span>Add photos</span><input type="file" accept="image/*" multiple onChange={event => addPhotos(event)} /></label>}</div></div>
      <label className={s.field}>Description<textarea aria-label="Report description" rows={3} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label className={s.field}>Access notes<textarea aria-label="Access notes" rows={3} value={access} onChange={event => setAccess(event.target.value)} /></label>
      <div className={s.location}><IoLocationOutline /><span>Greenway Trail · Boone, NC</span><IoLockClosedOutline /></div>
      <details className={s.retained}><summary>Original report<IoChevronDown /></summary><img className={s.originalThumb} src={PHOTO} alt="Preserved original report photo" /><p>{ORIGINAL}</p><small>Reported November 24 by Riley</small></details>
      <button className={s.primary} disabled={!changed || photoCount === 0 || !description.trim()} onClick={() => { setSaved(true); setResolved(false); go('review'); }}>Save update</button>
    </div>;
    if (stage === 'review') return <div className={s.formContent}><Tag kind={needsTeam ? 'amber' : 'lilac'}>{needsTeam ? 'Litterbugs review' : 'Report updated'}</Tag><h1 className={s.spacedTitle}>{needsTeam ? 'Update under review' : 'Riley updated the report'}</h1><h2 className={s.reportTitle}>{TITLE}</h2>
      {needsTeam && <div className={`${s.consequence} ${reason === 'unsafe' ? s.dangerText : ''}`}><IoShieldCheckmarkOutline /><span>{reason === 'unsafe' ? 'Safety concern' : reason === 'gone' ? 'No litter reported' : 'Location change'} · site remains paused</span></div>}
      <section className={s.changeReview}><h3>Latest update</h3>{photos[0] && <img className={s.evidence} src={photos[0].src} alt="Updated report evidence" />}<small>Description</small><p>{description}</p>{newAccess && <><small>Access notes</small><p>{newAccess}</p></>}</section>
      <details className={s.retained}><summary>Original report<IoChevronDown /></summary><p>{ORIGINAL}</p><img className={s.originalThumb} src={PHOTO} alt="Original evidence, unchanged" /></details><div className={s.fundLock}><IoLockClosedOutline /><span>Cleanup fund</span><strong>$35</strong></div>
      {resolved ? <div className={s.resolved}><IoCheckmarkCircleOutline />Issue resolved</div> : !needsTeam ? <div className={s.reviewActions}><button className={s.primary} onClick={() => { setSaved(true); setResolved(true); go('site'); }}>Looks right</button><button className={s.secondary} onClick={() => { setSaved(true); setSent(true); go('reporter'); }}>Still an issue</button></div> : <button className={s.secondary} onClick={() => go('site')}>View report</button>}
    </div>;
    return <><div className={s.photoHeading}><img src={photos[0]?.src ?? PHOTO} alt="Current site report" /><span><Tag kind={paused ? 'amber' : keep ? 'mint' : 'available'}>{paused ? 'Update requested' : keep ? 'In progress' : 'Available'}</Tag></span></div><div className={s.heading}><h1>{TITLE}</h1><p className={s.place}><IoLocationOutline />Boone, North Carolina</p><Fund /></div><div className={s.publicActions}><button className={s.secondary} disabled={paused} onClick={() => setExistingFlow('funding')}>Fund{paused ? 'ing paused' : ' this cleanup'}</button><button className={s.cleanButton} disabled={paused || keep} onClick={() => setExistingFlow('claim')}>{paused ? 'Cleanup paused' : keep ? 'Claimed by Morgan' : 'Clean this site'}</button></div><div className={s.formContent}><h2>About this report</h2><p>{description}</p>{saved && <p className={s.accessNote}>{newAccess}</p>}<div className={s.byline}><Avatar letter="R" /><div><small>Reported by</small><strong>Riley</strong></div></div>{timeline()}</div></>;
  }
  const back = () => go(stage === 'issue' ? 'cleanup' : stage === 'edit' ? 'reporter' : 'cleanup');
  return <main className={s.lab}>
    <header className={s.labHeader}><img src="/brand/litterbugs-logo.png" alt="Litterbugs" /><div><h1>Cleanup issues</h1><p>Interactive concept · illustrative data · nothing is sent or saved to an account</p></div><button className={s.reset} onClick={reset}>Reset preview</button></header>
    <div className={s.workspace}><aside className={s.rail}><h2>Walk through the flow</h2><nav>{STAGES.map((row, i) => <button key={row.id} aria-current={stage === row.id ? 'step' : undefined} onClick={() => go(row.id)}><span>{i + 1}</span>{row.label}</button>)}</nav>
      <div className={s.labField}><label htmlFor="preview-reason">Scenario</label><select id="preview-reason" value={reason} onChange={event => chooseReason(event.target.value as Reason, true)}>{REASONS.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></div>
      <fieldset className={s.labEntry}><legend>Utility placement</legend><label><input type="radio" name="entry" checked={entry === 'menu'} onChange={() => setEntry('menu')} />More menu <small>Recommended</small></label><label><input type="radio" name="entry" checked={entry === 'inline'} onChange={() => setEntry('inline')} />Inline text</label></fieldset>
      <details className={s.references}><summary>Research & rules</summary><p>Quiet task utilities: <a href="https://refero.design/screens/128f5dee-15ec-4191-a2dd-49dfa382d29c" target="_blank" rel="noreferrer">Linear</a> and <a href="https://refero.design/screens/f877fa0e-47cb-4a81-b734-80bfdc84f13a" target="_blank" rel="noreferrer">komoot</a>. Short reason form: <a href="https://refero.design/screens/ddf84d41-d820-4435-8099-b0887934aea4" target="_blank" rel="noreferrer">Buy Me a Coffee</a>.</p><p><a href="https://www.civicplus.help/seeclickfix/docs/customize-email-notifications" target="_blank" rel="noreferrer">SeeClickFix</a> links notifications to request activity. <a href="https://support.gofundme.com/hc/en-us/articles/360001992687-Editing-your-fundraiser-content" target="_blank" rel="noreferrer">GoFundMe</a> separates editable content from transfer settings.</p><p>Original evidence and the fund stay intact. Paused sites accept no new claims or contributions. Routine fixes need cleaner confirmation; safety, missing litter and relocation go to the team. Closure is not a completed cleanup or payout.</p></details>
    </aside><section className={s.stageArea}><div className={s.previewTools}><div><span className={s.eyebrow}>{stage === 'review' && needsTeam ? 'Awaiting team review' : current.role}</span><h2>{current.label}</h2></div><div className={s.viewToggle}><button aria-pressed={view === 'app'} onClick={() => setView('app')}>App</button><button aria-pressed={view === 'web'} onClick={() => setView('web')}>Website</button></div></div>
      {existingFlow && <div className={s.labNotice} role="status">{existingFlow === 'giveback' ? 'The existing give-back flow stays separate. A personal scheduling change does not flag the site.' : existingFlow === 'photos' ? 'The existing cleanup-photo flow stays unchanged. This concept previews the issue workflow.' : 'The existing contribution and claim flows stay unchanged. No payment or claim is created in this preview.'}<button aria-label="Dismiss preview note" onClick={() => setExistingFlow(null)}><IoClose /></button></div>}
      <div className={`${s.product} ${view === 'app' ? s.app : s.web}`}>
        {view === 'app' ? <div className={s.statusBar}><strong>9:41</strong><span className={s.island} /><span>▮▮▮ ▰</span></div> : <div className={s.siteNav}><img src="/brand/litterbugs-logo.png" alt="Litterbugs" /><span>Open map</span><span>Report</span><span>Donate</span><span className={s.navSpacer} /><IoNotificationsOutline /><Avatar letter={current.role === 'Reporter' ? 'R' : 'M'} mint /></div>}
        <div className={s.toolbar}><button onClick={back} aria-label="Back"><IoArrowBack /><span>{stage === 'cleanup' || stage === 'site' ? 'Back to map' : 'Back'}</span></button><span className={s.navSpacer} />{stage === 'cleanup' && <button className={s.iconButton} aria-label="Notifications" onClick={() => go('inbox')}><IoNotificationsOutline /></button>}{['issue', 'edit'].includes(stage) && <button className={s.iconButton} onClick={back} aria-label="Close form"><IoClose /></button>}</div>
        <div className={s.productBody} ref={body}>{content()}</div>{view === 'app' && <div className={s.homeBar}><span /></div>}
      </div>
      <div className={s.stateSummary}><span><IoLockClosedOutline />Fund <strong>$35</strong></span><span>{resolved ? <IoCheckmark /> : <IoTimeOutline />}<strong>{resolved ? 'Resolved' : hasIssue ? 'Awaiting update' : 'Claimed'}</strong></span><span>Claim <strong>{keep ? 'Retained' : 'Given back'}</strong></span></div>
      <p className={s.previewNote}>Preview only. Issue notes are private; the public page shows the status and existing Timeline.</p>
    </section></div>
  </main>;
}
