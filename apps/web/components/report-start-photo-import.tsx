'use client';
import { useCallback, useEffect, useState } from 'react';
import { clearReportStartPhoto, loadReportStartPhoto } from '@/lib/report-photo-start';

/** Adds the photo chosen on the homepage as soon as the report opens; a manual button remains only if that fails. */
export function ReportStartPhotoImport({ onAdd, disabled }: { onAdd: (files: File[]) => Promise<boolean | undefined>; disabled: boolean }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [attempted, setAttempted] = useState(false);
  useEffect(() => { void loadReportStartPhoto().then(setPhoto).catch(() => setMessage('Your homepage photo could not be loaded. Return home to retry.')); }, []);
  const add = useCallback(async (file: File) => {
    if (await onAdd([file])) {
      setPhoto(null);
      try { await clearReportStartPhoto(); } catch { setMessage('Photo added. The temporary homepage copy could not be removed.'); }
    }
  }, [onAdd]);
  useEffect(() => {
    if (!photo || disabled || attempted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one automatic import per opened report
    setAttempted(true);
    void add(photo);
  }, [photo, disabled, attempted, add]);
  if (!photo && !message) return null;
  return <div className="report-start-import">
    {photo && attempted && <><p>Your homepage photo is ready: {photo.name}</p><button className="secondary-button" disabled={disabled} onClick={() => void add(photo)}>Use this photo</button></>}
    {message && <p role="status">{message}</p>}
  </div>;
}
