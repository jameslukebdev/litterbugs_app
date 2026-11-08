'use client';
/* eslint-disable @next/next/no-img-element -- report thumbnails come from the report photo route. */
import { useState } from 'react';
import { formatUsd } from '@/lib/funding';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * One report that reached the end of its 30 days: keep it open for another 30, or close it and refund the
 * fund. Says plainly what happens if the reporter does nothing (it closes and refunds on the deadline).
 */
export function RenewalDecision({ id, title, place, photo, fundCents, due, busy, onRenew, onClose }: {
  id: string; title: string; place: string; photo: string | null; fundCents: number; due: string;
  busy: '' | 'renew' | 'close' | 'other'; onRenew: () => void; onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const hasFund = fundCents > 0;
  return (
    <article id={`renewal-${id}`} tabIndex={-1} className="renew-card renewal-decision">
      <div className="renew-top">
        {photo ? <img src={photo} alt="" /> : <span className="renew-thumb-empty" aria-hidden="true"><img src="/brand/ranks/dragonfly.svg" alt="" /></span>}
        <div>
          <strong>{title}</strong>
          <small>{place}</small>
          {hasFund && <span className="renew-fund"><img src="/brand/bugs/bee.png" alt="" aria-hidden="true" width={14} height={14} />{formatUsd(fundCents)} in its cleanup fund</span>}
        </div>
      </div>
      <p className="renew-deadline">
        Decide by <b>{day(due)}</b>. If you don&rsquo;t, it closes{hasFund ? ' and everyone who chipped in is refunded' : ''}.
      </p>
      {confirming ? (
        <div className="renew-confirm" role="group" aria-label="Confirm closing this report">
          <p>{hasFund ? 'Close this report? Everyone who added money to its fund gets a full refund, including the service fee. This can’t be undone.' : 'Close this report? It comes off the map. This can’t be undone.'}</p>
          <div className="cleaner-buttons">
            <button type="button" className="secondary-button" onClick={() => setConfirming(false)} disabled={busy === 'close'}>Keep it open</button>
            <button type="button" className="danger-button" onClick={onClose} disabled={Boolean(busy)}>{busy === 'close' ? 'Closing…' : hasFund ? 'Close and refund' : 'Close report'}</button>
          </div>
        </div>
      ) : (
        <div className="renew-actions">
          <button type="button" className="primary-button" onClick={onRenew} disabled={Boolean(busy)}>{busy === 'renew' ? 'Renewing…' : 'Renew 30 days'}</button>
          <button type="button" className="renew-close" onClick={() => setConfirming(true)} disabled={Boolean(busy)}>{hasFund ? 'Close and refund' : 'Close report'}</button>
        </div>
      )}
    </article>
  );
}
