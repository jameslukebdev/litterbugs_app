'use client';
import { useEffect, useState } from 'react';
import { clearReportStartPhoto, loadReportStartPhoto } from '@/lib/report-photo-start';
export function ReportStartPhotoImport({ onAdd, disabled }: { onAdd: (files: File[]) => Promise<boolean | undefined>; disabled: boolean }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { void loadReportStartPhoto().then(setPhoto).catch(() => setMessage('Your homepage photo could not be loaded. Return home to retry.')); }, []);
  if (!photo && !message) return null;
  return <div className="report-start-import">
    {photo && <><p>Your homepage photo is ready: {photo.name}</p><button className="secondary-button" disabled={disabled} onClick={async () => {
      if (await onAdd([photo])) { setPhoto(null); try { await clearReportStartPhoto(); } catch { setMessage('Photo added. The temporary homepage copy could not be removed.'); } }
    }}>Use this photo</button></>}
    {message && <p role="status">{message}</p>}
  </div>;
}
