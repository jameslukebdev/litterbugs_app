'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import styles from './preview.module.css';

export type PreviewScreen = 'account' | 'signup' | 'email' | 'unsubscribe' | 'preferences' | 'recipients';
type Status = 'subscribed' | 'unsubscribed' | 'not_subscribed';
type Member = { name: string; email: string; status: Status; source: 'Existing account' | 'Signup choice' | 'Account settings' };

const SCREENS: { id: PreviewScreen; title: string; description: string }[] = [
  { id: 'account', title: 'App settings', description: 'A current member starts with weekly emails switched on.' },
  { id: 'signup', title: 'New account', description: 'New members can choose weekly emails. The box starts unchecked.' },
  { id: 'email', title: 'Weekly email', description: 'Luke sends from Gmail. The footer links to unsubscribe and preferences.' },
  { id: 'unsubscribe', title: 'Unsubscribe', description: 'One small page. Enter an email address; no sign-in required.' },
  { id: 'preferences', title: 'Website preferences', description: 'The same email choice, available from a member’s account.' },
  { id: 'recipients', title: 'Luke’s recipient list', description: 'Copy a fresh Bcc list or download a CSV before each weekly send.' },
];

function initialMembers(): Member[] {
  const examples = ['Alex Morgan', 'Sam Rivera', 'Taylor Brooks', 'Casey Lane', 'Jordan Ellis', 'Riley Reed'];
  return Array.from({ length: 200 }, (_, index) => ({
    name: examples[index] ?? `Member ${index + 1}`,
    email: index === 0 ? 'alex@example.com' : `member${String(index + 1).padStart(3, '0')}@example.com`,
    status: 'subscribed',
    source: 'Existing account',
  }));
}

function Icon({ kind, size = 22 }: { kind: 'mail' | 'back' | 'check' | 'copy' | 'download' | 'user' | 'arrow'; size?: number }) {
  const paths: Record<typeof kind, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    back: <path d="m14 6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[kind]}</svg>;
}

function Logo() {
  // The existing wordmark asset is also used by the real app and website.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.logo} src="/brand/litterbugs-logo.png" alt="Litterbugs" />;
}

function Phone({ children }: { children: ReactNode }) {
  return <div className={styles.phone}>
    <div className={styles.statusBar} aria-hidden><strong>9:41</strong><span className={styles.island} /><span>▮▮▮ &nbsp; ▰</span></div>
    {children}
    <div className={styles.homeBar} aria-hidden />
  </div>;
}

function PreferenceForm({ subscribed, onSave, website = false }: { subscribed: boolean; onSave: (next: boolean) => void; website?: boolean }) {
  const [checked, setChecked] = useState(subscribed);
  const [saved, setSaved] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(checked);
    setSaved(true);
  };
  return <form className={styles.preferenceForm} onSubmit={submit}>
    <span className={styles.mailIcon}><Icon kind="mail" size={26} /></span>
    <h1>Email preferences</h1>
    <p className={styles.intro}>A little news from your cleanup community.</p>
    <p className={styles.address}>alex@example.com</p>
    <div className={styles.preferenceBox}>
      <div className={styles.preferenceRow}>
        <label htmlFor={website ? 'website-weekly' : 'app-weekly'}><strong>Weekly Litterbugs emails</strong><span>Cleanup opportunities, community stories, and ways to support cleanups.</span></label>
        <input id={website ? 'website-weekly' : 'app-weekly'} className={styles.switch} role="switch" type="checkbox" checked={checked} onChange={e => { setChecked(e.target.checked); setSaved(false); }} />
      </div>
      <p className={styles.frequency}>About once a week. Unsubscribe anytime.</p>
    </div>
    <p className={styles.reassurance}>This choice only changes weekly emails. You’ll still receive essential account and payment emails.</p>
    <button className={styles.primary} type="submit" disabled={checked === subscribed && !saved}>{saved ? 'Saved' : 'Save preferences'}</button>
    {saved ? <p className={styles.success} role="status"><Icon kind="check" size={18} />Preferences saved. Weekly emails are {checked ? 'on' : 'off'}.</p> : null}
  </form>;
}

function Signup({ onCreate }: { onCreate: (member: { name: string; email: string; subscribed: boolean }) => void }) {
  const [weekly, setWeekly] = useState(false);
  const [name, setName] = useState('Jamie Parker');
  const [email, setEmail] = useState('jamie@example.com');
  const [created, setCreated] = useState(false);
  if (created) return <div className={styles.signupSuccess}>
    <span className={styles.successIcon}><Icon kind="check" size={30} /></span>
    <h1>You’re all set</h1>
    <p>Your Litterbugs account is ready.</p>
    <p className={styles.reassurance}>{weekly ? 'You’ve also chosen to receive weekly Litterbugs emails.' : 'Weekly emails are off. You can turn them on later in your account settings.'}</p>
    <button className={styles.primary} onClick={() => { setCreated(false); setWeekly(false); }}>Back to signup</button>
  </div>;
  return <form className={styles.signupForm} onSubmit={e => { e.preventDefault(); onCreate({ name: name.trim(), email: email.trim(), subscribed: weekly }); setCreated(true); }}>
    <Logo />
    <h1>Make a little difference</h1>
    <p className={styles.intro}>Create your free Litterbugs account.</p>
    <label className={styles.field}>Your name<input autoComplete="off" value={name} onChange={e => setName(e.target.value)} required /></label>
    <label className={styles.field}>Email address<input type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} required /></label>
    <label className={styles.signupChoice}><input type="checkbox" checked={weekly} onChange={e => setWeekly(e.target.checked)} /><span><strong>Send me weekly Litterbugs emails</strong><span>Cleanup opportunities, community stories, and ways to support cleanups. Unsubscribe anytime.</span></span></label>
    <p className={styles.optional}>Optional. Your account works either way.</p>
    <button type="submit" className={styles.primary}>Create account</button>
    <p className={styles.terms}>By creating an account, you agree to the Terms and Privacy Policy.</p>
  </form>;
}

function Unsubscribe({ onUnsubscribe, onPreferences }: { onUnsubscribe: (email: string) => void; onPreferences: () => void }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  if (done) return <div className={styles.unsubscribeSuccess}>
    <Logo />
    <span className={styles.successIcon}><Icon kind="check" size={30} /></span>
    <h1>You’re unsubscribed</h1>
    <p>Weekly Litterbugs emails have been turned off for <strong className={styles.breakEmail}>{email.trim()}</strong>.</p>
    <p className={styles.reassurance}>You’ll still receive essential account and payment emails.</p>
    <button className={styles.secondary} onClick={onPreferences}>Go to email preferences</button>
    <button className={styles.textButton} onClick={() => { setEmail(''); setDone(false); }}>Use a different email address</button>
  </div>;
  return <form className={styles.unsubscribeForm} onSubmit={e => { e.preventDefault(); onUnsubscribe(email.trim()); setDone(true); }}>
    <Logo />
    <span className={styles.mailIcon}><Icon kind="mail" size={28} /></span>
    <h1>Unsubscribe from weekly emails</h1>
    <p>Enter the email address that receives your Litterbugs emails.</p>
    <label className={styles.field}>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <button className={styles.primary} type="submit">Unsubscribe</button>
    <p className={styles.reassurance}>No sign-in needed. This won’t affect your Litterbugs account.</p>
  </form>;
}

function Email({ onUnsubscribe, onPreferences }: { onUnsubscribe: () => void; onPreferences: () => void }) {
  return <div className={styles.emailWindow}>
    <div className={styles.emailToolbar}><span>Gmail</span><span>Inbox</span></div>
    <div className={styles.emailHeader}>
      <h1>A little cleanup news from Litterbugs</h1>
      <div className={styles.sender}><span className={styles.senderIcon}><Icon kind="mail" /></span><div><strong>Litterbugs Community Cleanup</strong><span>teamlitterbugs@gmail.com</span><small>to me</small></div><time>9:00 AM</time></div>
    </div>
    <article className={styles.emailBody}>
      <Logo />
      <h2>This week with Litterbugs</h2>
      <p>Hi Alex,</p>
      <p>Here’s a little inspiration for the week ahead: a spot to help clean, a chance to fund someone’s effort, or a reminder that small actions add up.</p>
      <div className={styles.emailCallout}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/bugs/bee.png" alt="" />
        <div><h3>A few dollars. A cleaner spot.</h3><p>Adding to a cleanup fund gives someone a little extra reason to get out there and help.</p></div>
      </div>
      <p>Thanks for being part of the community.</p>
      <p>Luke<br /><strong>Litterbugs Community Cleanup</strong></p>
      <footer className={styles.emailFooter}>
        <p>Litterbugs Community Cleanup<br /><span className={styles.placeholder}>[Business mailing address]</span></p>
        <nav aria-label="Email footer links"><a href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a><span aria-hidden> | </span><a href="?screen=unsubscribe" onClick={e => { e.preventDefault(); onUnsubscribe(); }}>Unsubscribe</a><span aria-hidden> | </span><a href="?screen=preferences" onClick={e => { e.preventDefault(); onPreferences(); }}>Email preferences</a></nav>
      </footer>
    </article>
  </div>;
}

function Recipients({ members, onEmail }: { members: Member[]; onEmail: () => void }) {
  const [filter, setFilter] = useState<'subscribed' | 'all' | 'unsubscribed'>('subscribed');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const subscribed = members.filter(m => m.status === 'subscribed');
  const unsubscribed = members.filter(m => m.status === 'unsubscribed');
  const visible = members.filter(m => (filter === 'all' || m.status === filter) && `${m.name} ${m.email}`.toLowerCase().includes(query.toLowerCase()));
  const copy = async () => {
    try { await navigator.clipboard.writeText(subscribed.map(m => m.email).join(', ')); setCopied(true); setError(''); }
    catch { setError('Copy wasn’t available in this browser. Download the CSV instead.'); }
  };
  const download = () => {
    const csv = 'email\r\n' + subscribed.map(m => m.email).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'litterbugs-sample-weekly-emails.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className={styles.admin}>
    <div className={styles.adminTop}><div><h1>Weekly email list</h1><p>The current audience for your next email.</p></div><button className={styles.secondary} onClick={onEmail}>Preview weekly email<Icon kind="arrow" size={18} /></button></div>
    <div className={styles.counts}><div><strong>{subscribed.length}</strong><span>Subscribed</span></div><div><strong>{unsubscribed.length}</strong><span>Unsubscribed</span></div><div><strong>{members.length}</strong><span>Total accounts</span></div></div>
    <div className={styles.exportPanel}><span className={styles.mailIcon}><Icon kind="mail" size={24} /></span><div><h2>Ready for Gmail</h2><p>Copy this list into <strong>Bcc</strong>. Use a fresh list for each weekly email.</p></div><div className={styles.exportActions}><button className={styles.primary} disabled={!subscribed.length} onClick={copy}><Icon kind="copy" size={18} />{copied ? 'Bcc list copied' : 'Copy Bcc list'}</button><button className={styles.secondary} disabled={!subscribed.length} onClick={download}><Icon kind="download" size={18} />Download CSV</button></div></div>
    {copied ? <p className={styles.success} role="status">{subscribed.length} sample addresses copied. Paste them into Gmail’s Bcc field.</p> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <div className={styles.listTools}><div className={styles.filters} role="group" aria-label="Filter recipients">{(['subscribed', 'all', 'unsubscribed'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All accounts' : value === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}</button>)}</div><input className={styles.search} aria-label="Search sample recipients" placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} /></div>
    <div className={styles.tableScroll}><table><thead><tr><th scope="col">Member</th><th scope="col">Weekly emails</th><th scope="col">How they joined</th></tr></thead><tbody>{visible.slice(0, 8).map(m => <tr key={m.email}><td><strong>{m.name}</strong><span>{m.email}</span></td><td><span className={m.status === 'subscribed' ? styles.subscribed : styles.muted}>{m.status === 'subscribed' ? 'Subscribed' : m.status === 'unsubscribed' ? 'Unsubscribed' : 'Not subscribed'}</span></td><td>{m.source}</td></tr>)}</tbody></table>{visible.length === 0 ? <p className={styles.empty}>No accounts match this view.</p> : null}</div>
    <p className={styles.tableNote}>Showing {Math.min(8, visible.length)} of {visible.length} sample accounts. Addresses are examples, not your real mailing list.</p>
  </div>;
}

export function EmailOptInPreview({ initialScreen }: { initialScreen: PreviewScreen }) {
  const [revision, setRevision] = useState(0);
  return <PreviewSession key={revision} initialScreen={initialScreen} onReset={() => {
    const url = new URL(window.location.href); url.searchParams.set('screen', initialScreen); window.history.replaceState(null, '', url);
    setRevision(r => r + 1);
  }} />;
}

function PreviewSession({ initialScreen, onReset }: { initialScreen: PreviewScreen; onReset: () => void }) {
  const [screen, setScreen] = useState(initialScreen);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const current = members[0];
  const details = SCREENS.find(item => item.id === screen)!;
  const navigate = (next: PreviewScreen) => {
    setScreen(next);
    const url = new URL(window.location.href); url.searchParams.set('screen', next); window.history.replaceState(null, '', url);
  };
  const save = (next: boolean) => setMembers(list => list.map((m, index) => index === 0 ? { ...m, status: next ? 'subscribed' : 'unsubscribed', source: 'Account settings' } : m));
  const unsubscribe = (email: string) => setMembers(list => list.map(m => m.email.toLowerCase() === email.toLowerCase() ? { ...m, status: 'unsubscribed' } : m));
  const create = ({ name, email, subscribed }: { name: string; email: string; subscribed: boolean }) => setMembers(list => list.some(m => m.email.toLowerCase() === email.toLowerCase()) ? list : [...list, { name, email, status: subscribed ? 'subscribed' : 'not_subscribed', source: 'Signup choice' }]);
  return <main className={styles.preview}>
    <header className={styles.previewHeader}><Logo /><div><strong>Email preferences preview</strong><span>Local demo · Sample data · No emails sent</span></div><button className={styles.reset} onClick={onReset}>Reset preview</button></header>
    <div className={styles.workspace}>
      <aside className={styles.sidebar}><h2>The whole experience</h2><nav aria-label="Preview screens">{SCREENS.map((item, index) => <button key={item.id} aria-current={screen === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><span className={styles.stepNumber}>{index + 1}</span><span>{item.title}</span><Icon kind="arrow" size={16} /></button>)}</nav><div className={styles.policy}><strong>The starting point</strong><p>Current accounts stay subscribed until they unsubscribe. New accounts choose whether to join.</p></div><p className={styles.demoHelp}>Try <strong>alex@example.com</strong> on the unsubscribe page, then open Luke’s list to see it update.</p></aside>
      <section className={styles.previewArea} aria-label={details.title}><div className={styles.sceneTitle}><div><h2>{details.title}</h2><p>{details.description}</p></div><span className={styles.viewLabel}>{screen === 'account' || screen === 'signup' ? 'App / mobile' : screen === 'email' ? 'Gmail' : 'Website'}</span></div>
        <div className={`${styles.stage} ${screen === 'recipients' ? styles.adminStage : ''}`}>
          {screen === 'account' ? <Phone><div className={styles.phoneNav}><span><Icon kind="back" />Settings</span></div><PreferenceForm subscribed={current.status === 'subscribed'} onSave={save} /></Phone> : null}
          {screen === 'signup' ? <Phone><Signup onCreate={create} /></Phone> : null}
          {screen === 'email' ? <Email onUnsubscribe={() => navigate('unsubscribe')} onPreferences={() => navigate('preferences')} /> : null}
          {screen === 'unsubscribe' ? <div className={styles.publicPaper}><Unsubscribe onUnsubscribe={unsubscribe} onPreferences={() => navigate('preferences')} /></div> : null}
          {screen === 'preferences' ? <div className={styles.website}><div className={styles.websiteNav}><Logo /><span><Icon kind="user" size={18} />My account</span></div><div className={styles.webPreferences}><div className={styles.webBreadcrumb}>Account <span>/</span> Email preferences</div><PreferenceForm website subscribed={current.status === 'subscribed'} onSave={save} /></div></div> : null}
          {screen === 'recipients' ? <Recipients members={members} onEmail={() => navigate('email')} /> : null}
        </div>
        <p className={styles.sceneNote}>{screen === 'email' ? 'The business mailing address is a placeholder. Footer links open the matching preview screens.' : screen === 'recipients' ? 'Copy and CSV use sample addresses only. This screen does not send email or connect to Gmail.' : screen === 'signup' ? 'This previews the email choice during account setup. Google and Apple signups would get the same optional choice.' : 'Changes here affect this preview only. Reset preview restores all sample accounts.'}</p>
      </section>
    </div>
  </main>;
}
