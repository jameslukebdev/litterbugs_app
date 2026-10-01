'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_REPORT_DRAFT, type Coordinates, type ReportDraft } from '@litterbugs/report-contract';
import { trackDeviceSave } from '@/lib/device-save-state';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { CloudDraftStatus } from '@/components/cloud-draft-status';
import { useDraftEditorLock } from '@/lib/use-draft-editor-lock';
import { ModalShell } from '@/components/modal-shell';
import { ReportWizard } from '@/components/report-wizard';
import { clearReportDraft, loadReportDraft, loadReportPublication, saveReportDraft, type ReportPublicationJournal, type ReportWizardSnapshot, type SavedReportDraft } from '@/lib/saved-report-draft';

export function ResumableReportWizard({ userId, submissionProgress, coordinates, selectingLocation, fundingEnabled, onCoordinatesChange, onRestorePublication, onChangeLocation, onClose, onSubmit }: {
  userId: string;
  submissionProgress?: string;
  coordinates: Coordinates;
  selectingLocation: boolean;
  fundingEnabled: boolean;
  onCoordinatesChange: (coordinates: Coordinates) => void;
  onRestorePublication: (journal: ReportPublicationJournal | undefined) => void;
  onChangeLocation?: () => void;
  onClose: () => void;
  onSubmit: (draft: ReportDraft, amount: number | null) => Promise<string | null>;
}) {
  const editorLock = useDraftEditorLock(userId, 'report');
  const [locked, setLocked] = useState(cloudDrafts.status(userId, 'report') === 'submitting');
  const [generation, setGeneration] = useState(0);
  useEffect(() => cloudDrafts.subscribe((owner,key,status) => { if(owner===userId && key==='report') setLocked(status==='submitting'); }), [userId]);
  const [mode, setMode] = useState<'loading' | 'resume' | 'editing' | 'close' | 'error'>('loading');
  const [saved, setSaved] = useState<SavedReportDraft>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const snapshot = useRef<ReportWizardSnapshot | null>(null);
  const active = useRef(true);
  useEffect(() => {
    if(editorLock !== 'ready') return;
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
  }, [userId, onRestorePublication, editorLock]);

  const saveSnapshot = useCallback((next: ReportWizardSnapshot) => {
    if(locked || mode !== 'editing') return;
    snapshot.current = next;
    void saveReportDraft(userId, { ...next, coordinates }).then(() => {
      if (active.current) setMessage('');
    }).catch(() => {
      if (active.current) setMessage('Draft could not be saved on this browser. Keep this screen open and try Save for later again.');
    });
  }, [userId, coordinates, locked, mode]);

  async function prepareAndSavePhotos(selected: File[], current: ReportWizardSnapshot, progress: (done: number, total: number) => void, onPrepared: (draft: ReportDraft) => void) {
    return trackDeviceSave(userId, 'report', async () => {
      const photos = await prepareBrowserPhotos(selected, progress);
      const next = { ...current, draft: { ...current.draft, photos: [...current.draft.photos, ...photos] } };
      snapshot.current = next;
      onPrepared(next.draft);
      await saveReportDraft(userId, { ...next, coordinates });
      return next.draft;
    });
  }

  async function closeDraft(discard: boolean) {
    setBusy(true);
    try {
      if (discard) {
        await clearReportDraft(userId);
        onRestorePublication(undefined);
      } else if (snapshot.current) await saveReportDraft(userId, { ...snapshot.current, coordinates });
      onClose();
    } catch { setMessage(discard ? 'Draft could not be discarded. It is still available; keep this screen open and try again.' : 'Draft could not be saved. Keep this screen open and try again.'); }
    finally { setBusy(false); }
  }

  const syncStatus = <CloudDraftStatus userId={userId} draftKey="report" onRestored={async () => {
    const restored = await loadReportDraft(userId); if(restored) {setSaved(restored);onCoordinatesChange(restored.coordinates);setGeneration(value=>value+1);}
  }} />;
  if(editorLock === 'unavailable') return <ModalShell label="Draft open in another tab" onClose={onClose}><h2>Draft open in another tab</h2><p>Close the other draft editor, then reopen this draft here.</p></ModalShell>;
  if (mode === 'loading' || mode === 'resume' || mode === 'error') return (
    <ModalShell label="Saved report" onClose={onClose} closeDisabled={busy}>
      <div className="wizard-content">
        <h2>{mode === 'loading' ? 'Checking for a saved report…' : mode === 'error' ? 'Draft unavailable' : 'Resume your report?'}</h2>
        {mode === 'resume' && <><p><strong>{saved?.draft.title || 'Untitled litter report'}</strong><br />{saved?.draft.photos.length ?? 0} photos · Step {(saved?.step ?? 0) + 1} of 5<br />{saved?.coordinates.latitude.toFixed(4)}, {saved?.coordinates.longitude.toFixed(4)}</p>{pending && <p>Your last submission needs checking. Resume and submit again to check the original report.</p>}
          <div className="draft-recovery-actions"><button className="primary-button" disabled={busy} onClick={() => { onCoordinatesChange(saved!.coordinates); setMode('editing'); }}>Resume draft</button>
          {!pending && !locked && <button className="secondary-button" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await clearReportDraft(userId); setSaved(undefined); setMode('editing'); }
            catch { setMessage('The saved draft could not be cleared. Please try again.'); }
            finally { setBusy(false); }
          }}>Start new</button>}
          <button className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button></div>
        </>}
        {mode !== 'loading' && syncStatus}
        {message && <p role="alert">{message}</p>}
      </div>
    </ModalShell>
  );

  return <>
    <ReportWizard key={generation} draftSync={syncStatus} draftLocked={locked} submissionProgress={submissionProgress} draftSaveMessage={message} initialDraft={{ ...EMPTY_REPORT_DRAFT }} initialState={saved} onStateChange={saveSnapshot} onPreparePhotos={prepareAndSavePhotos} isEditing={false} fundingEnabled={fundingEnabled} coordinates={coordinates} selectingLocation={selectingLocation || mode === 'close'} onChangeLocation={onChangeLocation} onClose={() => setMode('close')} onSubmit={onSubmit} />
    {mode === 'close' && <ModalShell label="Keep your report?" onClose={() => { if (!busy) setMode('editing'); }} closeDisabled={busy}>
      <div className="wizard-content"><h2>Keep your report?</h2><p>Keep your photos and details to finish later. Discarding cancels any unfinished submission; an already published report stays published.</p>
        <div className="draft-recovery-actions"><button className="primary-button" disabled={busy} onClick={() => void closeDraft(false)}>Save for later</button>
        <button className="secondary-button" disabled={busy} onClick={() => setMode('editing')}>Keep editing</button>
        <button className="secondary-button" disabled={busy} onClick={() => void closeDraft(true)}>Discard draft</button></div>
        {syncStatus}
        {message && <p role="alert">{message}</p>}
      </div>
    </ModalShell>}
  </>;
}
