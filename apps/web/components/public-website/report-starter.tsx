'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';
import { clearReportStartPhoto, loadReportStartPhoto, saveReportStartPhoto } from '@/lib/report-photo-start';
import styles from './report-starter.module.css';

export function ReportStarter() {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const previewImage = useRef<HTMLImageElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void loadReportStartPhoto().then(setPhoto).catch(() => setError('Photo storage is unavailable. You can still start a report.')); }, []);
  useEffect(() => {
    if (!photo || !previewImage.current) return;
    const url = URL.createObjectURL(photo);
    previewImage.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function choose(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { const [prepared] = await prepareBrowserPhotos([file]); await saveReportStartPhoto(prepared); setPhoto(prepared); }
    catch (error) { setError(error instanceof Error ? error.message : 'Choose another photo.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.starter} aria-labelledby="report-starter-title">
    <h2 id="report-starter-title">Explore what you can do with Litterbugs</h2>
    <div className={styles.choices}>
      <article className={styles.choice} aria-labelledby="report-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-report.webp" alt="A person taking a photograph with a phone outdoors" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="report-choice-title">Report litter</h3>
        <p>See trash? Take a photo and start a report to earn money.</p>
        <div className={styles.action}>
          {photo && <img ref={previewImage} alt="Your selected litter photo" className={styles.preview} />}
          <input ref={input} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choose a litter photo" disabled={busy} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
          {photo ? <div className={styles.buttons}><Link className={styles.cta} href="/report">Continue report</Link><button type="button" className={styles.remove} disabled={busy} onClick={async () => { try { await clearReportStartPhoto(); setPhoto(null); } catch { setError('Could not remove the saved photo. Try again.'); } }}>Remove photo</button></div> : <button type="button" className={styles.cta} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Preparing photo…' : 'Add a photo'}</button>}
          {error && <p role="alert">{error} <Link href="/report">Start a report</Link></p>}
        </div>
      </article>
      <article className={styles.choice} aria-labelledby="fund-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-fund.webp" alt="A person holding a payment card while using a laptop" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="fund-choice-title">Fund a cleanup</h3>
        <p>Pick a spot and help pay someone to clean it up.</p>
        <div className={styles.action}><Link className={styles.cta} href="/fund-a-cleanup#fundable-reports">Choose a spot</Link></div>
      </article>
      <article className={styles.choice} aria-labelledby="clean-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-clean.webp" alt="A volunteer picking up litter outdoors" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="clean-choice-title">Earn money cleaning up</h3>
        <p>Find a spot that needs cleaning and see how much you could earn.</p>
        <div className={styles.action}><Link className={styles.cta} href="/map?view=reports&browse=1&status=available">Find a cleanup</Link></div>
      </article>
    </div>
  </section>;
}
