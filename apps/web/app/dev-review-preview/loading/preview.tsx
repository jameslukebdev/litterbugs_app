'use client';
import { useEffect, useRef, useState } from 'react';
import { LoadingFirefly } from '@/components/loading-firefly';
import styles from './preview.module.css';

/** Local comparison of the real report loader, without changing any report data. */
export function LoadingPreview() {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function start(duration?: number) {
    clearTimeout(timer.current);
    setActive(true);
    if (duration !== undefined) timer.current = setTimeout(() => setActive(false), duration);
  }
  return <main className={styles.page}>
    <p className={styles.eyebrow}>Local loading preview</p>
    <h1>A little glow while you wait</h1>
    <p>Quick responses skip the bug. Longer waits bring in a soft, steady glow. The results appear as soon as they are ready.</p>
    <div className={styles.buttons}>
      <button onClick={() => start(150)}>Quick response · 150 ms</button>
      <button onClick={() => start(1800)}>Slower response · 1.8 s</button>
      <button onClick={() => start()}>Keep loading</button>
      <button onClick={() => { clearTimeout(timer.current); setActive(false); }}>Show results now</button>
    </div>
    <section className={styles.preview} aria-busy={active} aria-label="Report loading preview">
      <LoadingFirefly active={active} />
      {!active && <div className={styles.ready}><span aria-hidden="true">✦</span><h2>Ready to explore</h2><p>No extra wait before showing the results.</p></div>}
    </section>
  </main>;
}
