'use client';

/* eslint-disable @next/next/no-img-element -- Report previews use the existing optimized private-photo endpoint. */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Report } from '@litterbugs/report-contract';
import { FiCheck, FiCopy, FiExternalLink, FiMail, FiShare2 } from 'react-icons/fi';

import { Icon } from '@/components/icon';
import { moveDialogFocus } from '@/lib/dialog-focus';
import {
  reportShareCopy,
  reportShareDestinationUrls,
  reportShareImageFilename,
  reportShareImageUrl,
} from '@/lib/report-share-destinations';
import styles from './report-share-dialog.module.css';

type ShareableReport = Pick<
  Report,
  'cleanup_state' | 'funded_amount_cents' | 'litter_types' | 'severity' | 'title' | 'types'
>;

type ShareFeedback = {
  message: string;
  tone: 'error' | 'success';
  /** Announced to screen readers only, because the button or panel already shows it. */
  quiet?: boolean;
};

/** Same bugs and words as the map pins: ladybug = needs a cleanup, caterpillar = being cleaned, flower = cleaned up. */
function shareStatus(state: ShareableReport['cleanup_state']) {
  if (state === 'completed') return { label: 'Cleaned up', bug: '/brand/bugs/flower.png', tone: 'done' as const };
  if (state === 'available') return { label: 'Needs a cleanup', bug: '/brand/bugs/ladybug.png', tone: 'open' as const };
  return { label: 'Being cleaned', bug: '/brand/ranks/caterpillar.svg', tone: 'busy' as const };
}

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function ReportShareDialog({
  open,
  report,
  previewPhotoUrl,
  shareUrl,
  onClose,
  onShared,
}: {
  open: boolean;
  report: ShareableReport;
  previewPhotoUrl: string | null;
  shareUrl: string;
  onClose: () => void;
  onShared?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const [feedback, setFeedback] = useState<ShareFeedback | null>(null);
  const [shareImageFile, setShareImageFile] = useState<File | null>(null);
  const [emailOptionsOpen, setEmailOptionsOpen] = useState(false);
  const [instagramPrepared, setInstagramPrepared] = useState(false);
  const nativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const { dialogTitle, title, message } = reportShareCopy(report);
  const shareMessage = `${message}\n\n${shareUrl}`;
  const imageUrl = reportShareImageUrl(shareUrl);
  const imageFilename = reportShareImageFilename(title);
  const status = shareStatus(report.cleanup_state);
  const showFund = report.funded_amount_cents > 0 && report.cleanup_state !== 'completed';
  const displayUrl = shareUrl.replace(/^https?:\/\//, '');
  const linkCopied = feedback?.message === 'Link copied.';

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !nativeShareAvailable || typeof navigator.canShare !== 'function') return;
    let cancelled = false;

    async function prepareShareImage() {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) return;
        const blob = await response.blob();
        const file = new File([blob], imageFilename, { type: blob.type || 'image/png' });
        if (!cancelled && navigator.canShare?.({ files: [file] })) setShareImageFile(file);
      } catch {
        // Text and link sharing remain available when the image cannot be prepared.
      }
    }

    void prepareShareImage();
    return () => {
      cancelled = true;
      setShareImageFile(null);
    };
  }, [imageFilename, imageUrl, nativeShareAvailable, open]);

  function closeDialog() {
    setFeedback(null);
    setEmailOptionsOpen(false);
    setInstagramPrepared(false);
    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }

    if (dialogRef.current) moveDialogFocus(dialogRef.current, event);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback({ message: 'Link copied.', tone: 'success', quiet: true });
    } catch {
      setFeedback({ message: 'The link couldn’t be copied. Select it and copy it, or pick an app below.', tone: 'error' });
    }
  }

  async function openNativeShare(destination = 'device') {
    if (!nativeShareAvailable) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback({
          message: `This browser can’t open the ${destination} share menu, so the link was copied instead.`,
          tone: 'success',
        });
      } catch {
        setFeedback({
          message: `This browser can’t open the ${destination} share menu. Use Copy link or Email.`,
          tone: 'error',
        });
      }
      return;
    }

    try {
      await navigator.share({
        title,
        text: message,
        url: shareUrl,
        ...(shareImageFile ? { files: [shareImageFile] } : {}),
      });
      onShared?.();
      closeDialog();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedback({ message: 'Your device’s share menu didn’t open. Pick another option.', tone: 'error' });
    }
  }

  async function prepareInstagramCard() {
    downloadLinkRef.current?.click();
    setInstagramPrepared(true);
    try {
      await navigator.clipboard.writeText(shareMessage);
      setFeedback({
        message: 'Instagram card downloaded and caption copied.',
        tone: 'success',
        quiet: true,
      });
    } catch {
      setFeedback({
        message: 'The card downloaded, but the caption couldn’t be copied. Use Copy link before you post.',
        tone: 'error',
      });
    }
  }

  async function copyEmailMessage() {
    try {
      await navigator.clipboard.writeText(`Subject: ${title} | Litterbugs\n\n${shareMessage}`);
      setFeedback({ message: 'Email text copied. Paste it into a new email.', tone: 'success' });
    } catch {
      setFeedback({ message: 'The email text couldn’t be copied. Pick Gmail, Outlook or your email app instead.', tone: 'error' });
    }
  }

  if (!open) return null;

  const destinationUrls = reportShareDestinationUrls({ message, shareUrl, title });

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-share-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <a ref={downloadLinkRef} href={imageUrl} download={imageFilename} hidden aria-hidden="true" tabIndex={-1}>Download share image</a>
        <header className={styles.header}>
          <h2 id="report-share-title">{report.cleanup_state === 'completed' ? 'Share this cleanup' : dialogTitle}</h2>
          <button className={styles.close} type="button" onClick={closeDialog} aria-label="Close share options">
            <Icon name="close" />
          </button>
        </header>

        <article className={styles.preview} aria-label="Report being shared">
          <div className={styles.previewMedia}>
            {previewPhotoUrl ? (
              <img src={previewPhotoUrl} alt="" aria-hidden="true" />
            ) : (
              <img className={styles.previewLogo} src="/brand/litterbugs-logo.png" alt="" aria-hidden="true" />
            )}
          </div>
          <div className={styles.previewCopy}>
            <span className={styles.status} data-tone={status.tone}>
              <img src={status.bug} alt="" aria-hidden="true" width={16} height={16} />{status.label}
            </span>
            <strong>{title}</strong>
            {showFund ? (
              <span className={styles.fund}>
                <img src="/brand/bugs/bee.png" alt="" aria-hidden="true" width={14} height={14} />{formatUsd(report.funded_amount_cents)} in its cleanup fund
              </span>
            ) : null}
          </div>
        </article>

        <div className={styles.linkRow}>
          <span className={styles.linkText} title={shareUrl}>{displayUrl}</span>
          <button className={styles.copy} type="button" onClick={() => { void copyLink(); }}>
            {linkCopied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            {linkCopied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className={styles.tiles} aria-label="Sharing destinations">
          {nativeShareAvailable ? (
            <button className={styles.tile} type="button" onClick={() => { void openNativeShare(); }}>
              <span className={`${styles.tileIcon} ${styles.tileUtility}`} aria-hidden="true"><FiShare2 /></span>
              <span>More apps</span>
            </button>
          ) : null}
          <a className={styles.tile} href={destinationUrls.whatsapp} target="_blank" rel="noopener noreferrer">
            <span className={styles.tileIcon} aria-hidden="true"><img src="/brand/social/whatsapp-glyph.png" alt="" /></span>
            <span>WhatsApp</span>
          </a>
          <a className={styles.tile} href={destinationUrls.facebook} target="_blank" rel="noopener noreferrer">
            <span className={styles.tileIcon} aria-hidden="true"><img src="/brand/social/facebook-logo.png" alt="" /></span>
            <span>Facebook</span>
          </a>
          <button className={styles.tile} type="button" aria-expanded={instagramPrepared} onClick={() => { void prepareInstagramCard(); }}>
            <span className={styles.tileIcon} aria-hidden="true"><img src="/brand/social/instagram-glyph.png" alt="" /></span>
            <span>Instagram</span>
          </button>
          <button className={styles.tile} type="button" aria-expanded={emailOptionsOpen} onClick={() => setEmailOptionsOpen((current) => !current)}>
            <span className={`${styles.tileIcon} ${styles.tileUtility}`} aria-hidden="true"><FiMail /></span>
            <span>Email</span>
          </button>
          <a className={styles.tile} href={destinationUrls.x} target="_blank" rel="noopener noreferrer">
            <span className={styles.tileIcon} aria-hidden="true"><img src="/brand/social/x-logo.png" alt="" /></span>
            <span>X</span>
          </a>
        </div>

        {emailOptionsOpen ? (
          <div className={styles.helperPanel} role="group" aria-label="Email sharing choices">
            <strong>Your message and link are filled in. Open it in:</strong>
            <div className={styles.helperActions}>
              <a href={destinationUrls.email}>Default email app</a>
              <a href={destinationUrls.gmail} target="_blank" rel="noopener noreferrer">Gmail <FiExternalLink aria-hidden="true" /></a>
              <a href={destinationUrls.outlook} target="_blank" rel="noopener noreferrer">Outlook <FiExternalLink aria-hidden="true" /></a>
              <button type="button" onClick={() => { void copyEmailMessage(); }}>Copy email text</button>
            </div>
          </div>
        ) : null}
        {instagramPrepared ? (
          <div className={styles.helperPanel} role="group" aria-label="Instagram sharing instructions">
            <strong>Card downloaded and caption copied</strong>
            <ol className={styles.steps}>
              <li>In Instagram, tap <b>Create</b>, then <b>Post</b>.</li>
              <li>Pick the Litterbugs card you just downloaded.</li>
              <li>Paste the caption and share.</li>
            </ol>
            <div className={styles.helperActions}>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram <FiExternalLink aria-hidden="true" /></a>
              <button type="button" onClick={() => downloadLinkRef.current?.click()}>Download card again</button>
            </div>
          </div>
        ) : null}

        <p
          className={`${styles.feedback} ${feedback?.tone === 'error' ? styles.feedbackError : ''} ${!feedback || feedback.quiet ? styles.srOnly : ''}`}
          role="status"
          aria-live="polite"
        >
          {feedback?.message ?? ''}
        </p>
        <p className={styles.privacy}>People who open the link won’t see the exact location or anyone’s account details.</p>
      </div>
    </div>,
    document.body,
  );
}
