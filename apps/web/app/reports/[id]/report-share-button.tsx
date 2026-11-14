'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Icon } from '@/components/icon';
import { ReportShareDialog } from '@/components/report-share-dialog';
import styles from './report-share.module.css';

type DialogReport = ComponentProps<typeof ReportShareDialog>['report'];

/** Clipboard API first; browsers that refuse it (older ones, or an embedded page) get the selection-based copy. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch { /* fall through */ }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('copy unavailable');
}

/**
 * Shares the report's stable /reports/<id> link, the one that opens the mobile
 * app when it is installed. It behaves like sharing from a report card: phones
 * get the system share sheet, and elsewhere the share dialog opens with the
 * ready-made post, share image and destinations. Without `dialog` it copies the link.
 */
export function ReportShareButton({ reportId, label, title, message, dialog }: {
  reportId: string;
  label: string;
  title: string;
  message: string;
  dialog?: { report: DialogReport; previewPhotoUrl: string | null; expired?: boolean };
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function share() {
    const url = new URL(`/reports/${encodeURIComponent(reportId)}`, window.location.origin).toString();
    const native = typeof navigator.share === 'function'
      && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    try {
      if (native) {
        await navigator.share({ title, text: message, url });
      } else if (dialog) {
        setShareUrl(url);
      } else {
        try {
          await copy(url);
          setStatus('Link copied');
        } catch {
          // Copying is blocked here, so hand the visitor the link to copy themselves.
          window.prompt('Copy this link to share it:', url);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('The link could not be shared');
    }
  }

  return (
    <>
      <button type="button" ref={button} className={styles.share} onClick={share}>
        <Icon name="share" aria-hidden="true" />
        <span aria-live="polite">{status || label}</span>
      </button>
      {dialog && <ReportShareDialog expired={dialog.expired} open={Boolean(shareUrl)} report={dialog.report} previewPhotoUrl={dialog.previewPhotoUrl}
        shareUrl={shareUrl} onShared={() => setStatus('Shared')}
        onClose={() => { setShareUrl(''); window.requestAnimationFrame(() => button.current?.focus()); }} />}
    </>
  );
}
