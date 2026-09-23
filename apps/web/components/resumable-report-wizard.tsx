'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_REPORT_DRAFT, type Coordinates, type ReportDraft } from '@litterbugs/report-contract';
import { ModalShell } from '@/components/modal-shell';
import { ReportWizard } from '@/components/report-wizard';
import { clearReportDraft, loadReportDraft, loadReportPublication, saveReportDraft, type ReportPublicationJournal, type ReportWizardSnapshot, type SavedReportDraft } from '@/lib/saved-report-draft';

export function ResumableReportWizard({ userId, coordinates, selectingLocation, fundingEnabled, onCoordinatesChange, onRestorePublication, onChangeLocation, onClose, onSubmit }: {
  userId: string;
  coordinates: Coordinates;
  selectingLocation: boolean;
  fundingEnabled: boolean;
  onCoordinatesChange: (coordinates: Coordinates) => void;
  onRestorePublication: (journal: ReportPublicationJournal | undefined) => void;
  onChangeLocation?: () => void;
  onClose: () => void;
  onSubmit: (draft: ReportDraft, amount: number | null) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<'loading' | 'resume' | 'editing' | 'close' | 'error'>('loading');
  const [saved, setSaved] = useState<SavedReportDraft>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const snapshot = useRef<ReportWizardSnapshot | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void Promise.all([loadReportDraft(userId), loadReportPublication(userId)]).then(([draft, journal]) => {
      if (!active.current) return;
      onRestorePublication(journal);
      setPending(Boolean(journal));
      setSaved(draft);
      if (journal && !draft) {
        setMessage('A previous submission needs checking. Your saved draft is unavailable; refresh your reports before creating another report.');
        setMode('error');
      } else setMode(draft ? 'resume' : 'editing');
    }).catch(() => {
      if (active.current) { setMessage('Your saved report could not be loaded. Close this window and try again.'); setMode('error'); }
    });
    return () => { active.current = false; };
  }, [userId, onRestorePublication]);

  const saveSnapshot = useCallback((next: ReportWizardSnapshot) => {
    snapshot.current = next;
    void saveReportDraft(userId, { ...next, coordinates }).then(() => {
      if (active.current) setMessage('');
    }).catch(() => {
      if (active.current) setMessage('Draft could not be saved on this browser. Keep this screen open and try Save for later again.');
    });
  }, [userId, coordinates]);

  async function closeDraft(discard: boolean) {
    setBusy(true);
    try {
      if (discard) {
        // Check again because publication may have become uncertain since loading.
        if (await loadReportPublication(userId)) {
          setMessage('Your previous submission needs checking. Keep editing and submit again to recover it.');
          return;
        }
        await clearReportDraft(userId);
      } else if (snapshot.current) await saveReportDraft(userId, { ...snapshot.current, coordinates });
      onClose();
    } catch { setMessage('Draft could not be saved. Keep this screen open and try again.'); }
    finally { setBusy(false); }
  }

  if (mode === 'loading' || mode === 'resume' || mode === 'error') return (
    <ModalShell label="Saved report" onClose={onClose} closeDisabled={busy}>
      <div className="wizard-content">
        <h2>{mode === 'loading' ? 'Checking for a saved report…' : mode === 'error' ? 'Draft unavailable' : 'Resume your report?'}</h2>
        {mode === 'resume' && <><p>Your details, photos, and chosen location are saved in this browser.</p>{pending && <p>Your last submission needs checking. Resume and submit again to check the original report.</p>}
          <div className="draft-recovery-actions"><button className="primary-button" disabled={busy} onClick={() => { onCoordinatesChange(saved!.coordinates); setMode('editing'); }}>Resume draft</button>
          {!pending && <button className="secondary-button" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await clearReportDraft(userId); setSaved(undefined); setMode('editing'); }
            catch { setMessage('The saved draft could not be cleared. Please try again.'); }
            finally { setBusy(false); }
          }}>Start new</button>}
          <button className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button></div>
        </>}
        {message && <p role="alert">{message}</p>}
      </div>
    </ModalShell>
  );

  return <>
    <ReportWizard draftSaveMessage={message} initialDraft={{ ...EMPTY_REPORT_DRAFT }} initialState={saved} onStateChange={saveSnapshot} isEditing={false} fundingEnabled={fundingEnabled} coordinates={coordinates} selectingLocation={selectingLocation || mode === 'close'} onChangeLocation={onChangeLocation} onClose={() => setMode('close')} onSubmit={onSubmit} />
    {mode === 'close' && <ModalShell label="Keep your report?" onClose={() => { if (!busy) setMode('editing'); }} closeDisabled={busy}>
      <div className="wizard-content"><h2>Keep your report?</h2><p>Save your photos and details in this browser to finish later.</p>
        <div className="draft-recovery-actions"><button className="primary-button" disabled={busy} onClick={() => void closeDraft(false)}>Save for later</button>
        <button className="secondary-button" disabled={busy} onClick={() => setMode('editing')}>Keep editing</button>
        <button className="secondary-button" disabled={busy || pending} onClick={() => void closeDraft(true)}>Discard draft</button></div>
        {message && <p role="alert">{message}</p>}
      </div>
    </ModalShell>}
  </>;
}
