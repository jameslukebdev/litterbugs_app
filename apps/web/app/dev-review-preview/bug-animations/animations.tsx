'use client';
/* eslint-disable @next/next/no-img-element -- small bug artwork, like the map. */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FiCrosshair, FiEyeOff, FiHeart, FiImage } from 'react-icons/fi';
import s from './animations.module.css';

const BUG = {
  ladybug: '/brand/bugs/ladybug.png',
  flower: '/brand/bugs/flower.png',
  bee: '/brand/bugs/bee.png',
  dragonfly: '/brand/ranks/dragonfly.svg',
  caterpillar: '/brand/ranks/caterpillar.svg',
  ant: '/brand/bugs/ant.svg',
  lightning: '/brand/ranks/lightning-bug.svg',
  cocoon: '/brand/ranks/cocoon.svg',
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Demo({ n, title, where, why, children }: { n: number; title: string; where: string; why: string; children: ReactNode }) {
  const [run, setRun] = useState(0);
  return <section className={s.demo}>
    <header>
      <span className={s.num}>{n}</span>
      <div><h2>{title}</h2><p className={s.where}>{where}</p></div>
    </header>
    <div className={s.stage} key={run}>{children}</div>
    <div className={s.foot}><p>{why}</p><button type="button" onClick={() => setRun(value => value + 1)}>Play again</button></div>
  </section>;
}

const Pin = ({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) =>
  <span className={`${s.pin} ${className}`} style={style}>{children}</span>;

const MapBg = ({ children }: { children: ReactNode }) => <div className={s.map}>
  <svg className={s.roads} viewBox="0 0 320 200" aria-hidden="true"><path d="M-10 150 C 80 120 140 170 330 110" /><path d="M120 -10 C 140 60 100 120 170 210" /><path d="M210 -10 C 230 80 300 90 330 60" /></svg>
  {children}
</div>;

/* 1 — Ladybug turns into a flower when a cleanup is approved. */
function Bloom() {
  return <>
    <MapBg>
      <Pin className={s.bloomPin}>
        <img className={s.bloomOut} src={BUG.ladybug} alt="" />
        <img className={s.bloomIn} src={BUG.flower} alt="" />
        {[0, 1, 2, 3, 4].map(i => <i key={i} className={s.petal} style={{ '--a': `${i * 72}deg` } as CSSProperties} />)}
      </Pin>
    </MapBg>
    <p className={s.statusSwap}>
      <span className={s.statusOld}><img src={BUG.ladybug} alt="" />Available to clean</span>
      <span className={s.statusNew}><img src={BUG.flower} alt="" />Cleanup complete</span>
    </p>
  </>;
}

/* 2 — The bee carries the money into the fund. */
function BeeFund() {
  const [amount, setAmount] = useState(25);
  useEffect(() => {
    let frame = 0; const start = performance.now() + (reduced() ? -500 : 1150);
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 500));
      setAmount(Math.round(25 + 5 * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className={s.fundCard}>
    <p className={s.fundMoney}><img src={BUG.bee} alt="" /><strong className={s.fundAmount}>${amount}.00</strong> in its cleanup fund</p>
    <p className={s.fundTitle}>Roby Greene Rd off of Castle Ford rd</p>
    <span className={s.fundButton}><img src={BUG.bee} alt="" />Fund</span>
    <img className={s.flyingBee} src={BUG.bee} alt="" />
  </div>;
}

/* 3 — The dragonfly drops the new report's pin. */
function DragonflyPin() {
  return <MapBg>
    <svg className={s.trail} viewBox="0 0 320 200" aria-hidden="true"><path d="M 24 30 C 120 10 220 40 190 90 S 150 130 170 140" /></svg>
    <img className={s.dragonfly} src={BUG.dragonfly} alt="" />
    <span className={s.ripple} />
    <Pin className={s.dropPin}><img src={BUG.ladybug} alt="" /></Pin>
  </MapBg>;
}

/* 4 — A caterpillar inches along the rank bar. */
function RankCrawl() {
  return <div className={s.rankCard}>
    <div className={s.rankHead}><img src={BUG.ladybug} alt="" /><div><strong>Ladybug</strong><span>Your rank · 5 points</span></div></div>
    <div className={s.rankTrack}>
      <span className={s.rankFill} />
      <img className={s.crawler} src={BUG.caterpillar} alt="" />
    </div>
    <p className={s.rankNext}><img src={BUG.bee} alt="" /><strong>7 points</strong> to Honeybee</p>
  </div>;
}

/* 5 — An ant walks along a card while it loads. */
function AntLoading() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), reduced() ? 600 : 3200); return () => clearTimeout(t); }, []);
  return <div className={s.loadCard} aria-busy={!loaded}>
    {loaded ? <div className={s.loadedBody}>
      <span className={s.loadedPhoto}><FiImage aria-hidden="true" /></span>
      <strong>Trash along Winkler’s Creek Greenway</strong><span>Volunteer cleanup</span>
    </div> : <>
      <span className={`${s.bar} ${s.barPhoto}`} /><span className={`${s.bar} ${s.barTitle}`} /><span className={`${s.bar} ${s.barLine}`} />
      <span className={s.antTrack}><img className={s.ant} src={BUG.ant} alt="" /></span>
    </>}
  </div>;
}

/* 6 — Pins land on the map a few at a time. */
function PinsLand() {
  const pins: [number, number, string][] = [[60, 70, BUG.ladybug], [150, 50, BUG.ladybug], [230, 95, BUG.flower], [110, 125, BUG.caterpillar], [255, 40, BUG.ladybug]];
  return <MapBg>{pins.map(([x, y, bug], i) => <Pin key={i} className={s.landPin} style={{ left: x, top: y, animationDelay: `${150 + i * 110}ms` }}><img src={bug} alt="" /></Pin>)}</MapBg>;
}

/* 7 — The lightning bug glows while finding your location. */
function LocateGlow() {
  const [finding, setFinding] = useState(true);
  useEffect(() => { const t = setTimeout(() => setFinding(false), reduced() ? 400 : 2400); return () => clearTimeout(t); }, []);
  return <MapBg>
    {!finding && <span className={s.youDot} />}
    <span className={s.locate} aria-label={finding ? 'Finding your location' : 'Location found'}>
      {finding ? <img className={s.glowBug} src={BUG.lightning} alt="" /> : <FiCrosshair aria-hidden="true" />}
    </span>
    <span className={s.locateNote}>{finding ? 'Finding you…' : 'Found you'}</span>
  </MapBg>;
}

/* 8 — The cocoon wiggles on its heading (hover it). */
function CocoonWiggle() {
  return <div className={s.headingDemo}>
    <h3 className={s.wiggleHeading}><img className={s.cocoon} src={BUG.cocoon} alt="" />Reports needing a cleanup</h3>
    <p className={s.hint}>Hover the heading to wiggle it again.</p>
  </div>;
}

/* 9 — The flower opens when you switch to the After photo. */
function AfterBloom() {
  const [after, setAfter] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAfter(true), reduced() ? 0 : 800); return () => clearTimeout(t); }, []);
  return <div className={s.photoDemo}>
    <div className={s.photoFrame}>
      <img className={`${s.photo} ${after ? s.photoHidden : ''}`} src="/homepage-photos/reported-litter.webp" alt="" />
      <img className={`${s.photo} ${after ? '' : s.photoHidden}`} src="/homepage-photos/cleanup.webp" alt="" />
      <span className={s.photoTag}>{after ? <><img key="f" className={s.tagBloom} src={BUG.flower} alt="" />Cleaned up</> : <><img src={BUG.ladybug} alt="" />Before</>}</span>
    </div>
    <div className={s.switch}><button type="button" aria-pressed={after} onClick={() => setAfter(true)}>After</button><button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>Before</button></div>
  </div>;
}

/* 10 — Favourite hops; hiding sends the ladybug scurrying off. */
function HeartHide() {
  const [fav, setFav] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFav(true), reduced() ? 0 : 500);
    const b = setTimeout(() => setHidden(true), reduced() ? 0 : 1800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return <div className={s.heartDemo}>
    {hidden ? <p className={s.hiddenRow}><span>Report hidden</span><button type="button" onClick={() => setHidden(false)}>Undo</button></p> : null}
    <div className={`${s.miniCard} ${hidden ? s.miniGone : ''}`}>
      <span className={s.miniPhoto}><img src="/homepage-photos/reported-litter.webp" alt="" /><img className={s.miniBug} src={BUG.ladybug} alt="" /></span>
      <span className={s.miniCopy}><strong>Trash by the tracks</strong><span>Volunteer cleanup</span></span>
      <span className={s.miniActions}>
        <button type="button" className={`${s.heart} ${fav ? s.hearted : ''}`} aria-pressed={fav} aria-label="Favourite" onClick={() => setFav(v => !v)}><FiHeart aria-hidden="true" />{fav && [0, 1, 2, 3, 4, 5].map(i => <i key={i} style={{ '--a': `${i * 60}deg` } as CSSProperties} />)}</button>
        <button type="button" className={s.hide} aria-label="Hide report" onClick={() => setHidden(true)}><FiEyeOff aria-hidden="true" /></button>
      </span>
    </div>
    {hidden && <img className={s.scurry} src={BUG.ladybug} alt="" />}
  </div>;
}

/* 11 — An empty list gets a curious ladybug. */
function EmptyLadybug() {
  return <div className={s.empty}>
    <img className={s.walker} src={BUG.ladybug} alt="" />
    <strong>No reports here yet</strong>
    <span>Spotted litter nearby? Be the first to report it.</span>
  </div>;
}

/* 12 — The tab underline slides between tabs. */
function SlidingTabs() {
  const tabs = [['Open', BUG.ladybug], ['Completed', BUG.flower], ['Expired', null]] as const;
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bar, setBar] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => { const el = refs.current[active]; if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth }); }, [active]);
  useEffect(() => {
    if (reduced()) return;
    const timers = [1, 2, 0].map((tab, i) => setTimeout(() => setActive(tab), 700 + i * 900));
    return () => timers.forEach(clearTimeout);
  }, []);
  return <div className={s.tabs}>
    {tabs.map(([label, bug], i) => <button type="button" key={label} ref={el => { refs.current[i] = el; }} aria-current={i === active ? 'page' : undefined} onClick={() => setActive(i)}>
      {bug ? <img src={bug} alt="" /> : <span className={s.clock} aria-hidden="true">◷</span>}{label}
    </button>)}
    <span className={s.underline} style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} />
  </div>;
}


/* ---------- Bigger hover moments (round 2) ---------- */

/* B — "Explore what you can do" card: hovering anywhere plays its bug's move; the photo zooms a little. */
function ExploreCard() {
  return <div className={s.exploreCard}>
    <span className={s.exploreCardPhoto}><img src="/homepage-photos/action-report.webp" alt="" /></span>
    <strong>Report litter</strong>
    <span>See trash? Pin the spot, add photos, and earn money when it’s cleaned up.</span>
    <span className={s.exploreCardButton}><img className={s.exploreCardBug} src={BUG.dragonfly} alt="" />Report trash</span>
  </div>;
}

/* C — Map key: hovering a key line makes its pins move together. */
function KeyHover() {
  const [active, setActive] = useState<'open' | 'done' | null>(null);
  const pins: [number, number, 'open' | 'done'][] = [[60, 70, 'open'], [150, 50, 'open'], [235, 95, 'done'], [110, 130, 'open'], [255, 40, 'done']];
  return <MapBg>
    <div className={s.keyChip}>
      <span onMouseEnter={() => setActive('open')} onMouseLeave={() => setActive(null)}><img src={BUG.ladybug} alt="" /><strong>3</strong> need a cleanup</span>
      <span onMouseEnter={() => setActive('done')} onMouseLeave={() => setActive(null)}><img src={BUG.flower} alt="" /><strong>2</strong> cleaned up</span>
    </div>
    {pins.map(([x, y, kind], i) => <Pin key={i} className={active === kind ? (kind === 'open' ? s.keyWaddle : s.keySpin) : ''} style={{ left: x, top: y, animationDelay: `${i * 60}ms` }}><img src={kind === 'open' ? BUG.ladybug : BUG.flower} alt="" /></Pin>)}
  </MapBg>;
}

/* E — Header logo: a tiny bee loops around it. */
function LogoLoop() {
  return <div className={s.logoMock}>
    <span className={s.logoWrap}><img className={s.logoImg} src="/brand/litterbugs-logo.png" alt="Litterbugs" /><img className={s.logoBee} src={BUG.bee} alt="" /></span>
    <span className={s.logoNav}>Map · Report · Donate · Earn</span>
  </div>;
}

/* F — Reading pages: a caterpillar crawls along the top as you scroll. */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  return <div className={s.readMock}>
    <div className={s.readBar}><span style={{ width: `${progress}%` }} /><img src={BUG.caterpillar} alt="" style={{ left: `${progress}%` }} /></div>
    <div className={s.readScroll} onScroll={event => { const el = event.currentTarget; setProgress(Math.round(100 * el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight))); }}>
      <strong>Terms of use</strong>
      {Array.from({ length: 8 }, (_, i) => <p key={i}>Litterbugs lets members identify litter, contribute to cleanup funds, and voluntarily claim cleanups. Scroll to watch the caterpillar crawl along the top.</p>)}
    </div>
  </div>;
}

/* G — Community card: the photo zooms a little and the flower spins. */
function CommunityCard() {
  return <div className={s.communityCard}>
    <span className={s.communityPhoto}><img src="/homepage-photos/cleanup.webp" alt="" /></span>
    <span className={s.communityCopy}>
      <strong>Boone</strong>
      <span className={s.communityResult}><img src={BUG.flower} alt="" />Last cleanup Nov 8, 2026</span>
      <span className={s.communityLink}>Explore Boone ›</span>
    </span>
  </div>;
}

/* H — Page not found: a lost ladybug wanders back and forth. */
function LostLadybug() {
  return <div className={s.lost}>
    <div className={s.lostTrack}><img className={s.lostBug} src={BUG.ladybug} alt="" /></div>
    <strong>We can’t find that page</strong>
    <span>This ladybug is looking too. Try the map instead.</span>
  </div>;
}

export function BugAnimations() {
  return <main id="main-content" tabIndex={-1} className={s.page}>
      <header className={s.intro}>
        <h1>Bug animations</h1>
        <p>These demos show the animations available for local review. Use <strong>Play again</strong> to replay an example. Hover or scroll where the example calls for it. Reduced-motion settings simplify the effects.</p>
      </header>
      <h2 className={s.group}>Bigger hover moments (new)</h2>
      <p className={s.groupNote}>A whole area comes alive when you hover it, like the homepage map. Hover each preview.</p>
      <div className={s.grid}>
        <Demo n={14} title="Whole card hover" where="“Explore what you can do” cards" why="Hover anywhere on the card, not just the button."><ExploreCard /></Demo>
        <Demo n={15} title="The map key points at its pins" where="Homepage map preview and the full map’s key" why="Shows which pins are which."><KeyHover /></Demo>
        <Demo n={17} title="A bee loops the logo" where="Site header" why="The logo itself feels alive."><LogoLoop /></Demo>
        <Demo n={18} title="Caterpillar reading progress" where="Terms, Privacy, Help and other long pages" why="Shows how far through the page you are."><ReadingProgress /></Demo>
        <Demo n={19} title="Community card comes alive" where="Communities list (Boone card)" why="Photo zooms gently; the cleanup flower spins."><CommunityCard /></Demo>
        <Demo n={20} title="A lost ladybug" where="“Page not found”" why="Makes a dead end feel friendly."><LostLadybug /></Demo>
      </div>
      <h2 className={s.group}>Every bug has its own move</h2>
      <p className={s.groupNote}>These play whenever you hover (or tap) a button, link, tab, card, heading or map pin that has a bug, all over the site. Hover each one below.</p>
      <div className={s.moves}>
        {([['Ladybug', 'waddles', BUG.ladybug], ['Bee', 'buzzes', BUG.bee], ['Butterfly', 'flaps', '/brand/bugs/butterfly.png'], ['Dragonfly', 'darts', BUG.dragonfly], ['Caterpillar', 'inches', BUG.caterpillar], ['Flower', 'spins open', BUG.flower], ['Lightning bug', 'glows', BUG.lightning], ['Cocoon', 'rattles', BUG.cocoon], ['Ant', 'scurries', BUG.ant]] as const).map(([name, move, src]) =>
          <button type="button" key={name} className={s.move}><img src={src} alt="" width={34} height={34} /><strong>{name}</strong><span>{move}</span></button>)}
      </div>
      <h2 className={s.group}>The best five</h2>
      <div className={s.grid}>
        <Demo n={1} title="Ladybug turns into a flower" where="Map pin, report sheet and account list, when a cleanup is approved" why="Shows the change instead of just stating it."><Bloom /></Demo>
        <Demo n={2} title="The bee carries money to the fund" where="Report sheet, after someone funds a cleanup" why="Makes the contribution feel like it landed."><BeeFund /></Demo>
        <Demo n={3} title="The dragonfly drops a pin" where="Map, right after a report is submitted" why="Connects “I reported it” to “there it is”."><DragonflyPin /></Demo>
        <Demo n={4} title="A caterpillar crawls along the rank bar" where="Rank card on your profile" why="Progress you can watch fill up."><RankCrawl /></Demo>
        <Demo n={5} title="An ant walks while things load" where="Loading cards and photos" why="Shows the page is working, and gives the new ant a job."><AntLoading /></Demo>
      </div>
      <h2 className={s.group}>Smaller touches</h2>
      <div className={s.grid}>
        <Demo n={6} title="Pins land on the map" where="Map, as you pan, zoom, or change filters" why="Newly visible pins and groups land a few at a time."><PinsLand /></Demo>
        <Demo n={7} title="The lightning bug glows" where="Map’s find-my-location button" why="Glows while it’s searching, then hands back to the usual icon."><LocateGlow /></Demo>
        <Demo n={8} title="The cocoon wiggles" where="“Reports needing a cleanup” heading on the homepage" why="A hint that it’s about to hatch."><CocoonWiggle /></Demo>
        <Demo n={9} title="The flower opens on the After photo" where="Report sheet’s After / Before switch" why="The before-and-after moment gets a little celebration."><AfterBloom /></Demo>
        <Demo n={10} title="Favourite hops, hide scurries" where="Report cards and the report sheet" why="Feedback that you tapped the right thing."><HeartHide /></Demo>
        <Demo n={11} title="A curious ladybug in empty lists" where="Any list with no reports yet" why="Makes an empty screen feel friendly, not broken."><EmptyLadybug /></Demo>
        <Demo n={12} title="Tab underline slides" where="Open / Completed / Expired tabs and other tab rows" why="The underline glides instead of jumping."><SlidingTabs /></Demo>
      </div>
  </main>;
}
