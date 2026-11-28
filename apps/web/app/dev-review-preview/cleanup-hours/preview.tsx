'use client';
import { useState } from 'react';
import { CleanupEvidencePanel } from '@/components/cleanup-evidence-panel';
import { parseCleanupHours } from '@/lib/cleanup-duration';

const photo = '/reports/c9de971b-9b18-4e63-8b2d-00bba1de799c/photo/';
export function CleanupHoursPreview() {
  const [description, setDescription] = useState('Collected bottles, cans and wrappers around the cabin.');
  const [bags, setBags] = useState('2');
  const [weight, setWeight] = useState('10');
  const [hours, setHours] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  return <div className="account-theme"><main className="account-report-page">
    <h1>Your cleanup</h1>
    <p>Local preview — no report will be submitted.</p>
    <section className="account-task-workspace cleanup-flow-dialog cleanup-evidence-workspace" data-task="focused">
      <CleanupEvidencePanel correction={false} reportTitle="Trash in and around cabin" due={null}
        reporterPhoto={`${photo}before?width=640`} photos={[{key:'after',src:`${photo}after?width=640`,name:'after.jpg'}]}
        maxPhotos={3} onAddFiles={() => undefined} onRemovePhoto={() => undefined}
        description={description} onDescription={setDescription} bags={bags} onBags={setBags} weight={weight} onWeight={setWeight}
        hours={hours} onHours={value => {setHours(value);setError('');}}
        checking={checking} onCheck={() => {const invalid=parseCleanupHours(hours).error;setError(invalid??'');if(!invalid)setChecking(true);}}
        onEdit={() => setChecking(false)} onSubmit={() => undefined} paid={false}
        fieldsDisabled={false} checkDisabled={false} submitDisabled editDisabled={false} busy=""
        releaseConfirming={false} onRelease={() => undefined} onReleaseConfirming={() => undefined} releaseDisabled error={error} />
    </section>
  </main></div>;
}
