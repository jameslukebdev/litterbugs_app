'use client';

/* eslint-disable @next/next/no-img-element -- Report previews use the existing optimized private-photo endpoint. */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Report } from '@litterbugs/report-contract';
import { FiCheck, FiCopy, FiDownload, FiMail, FiShare2 } from 'react-icons/fi';

import { Icon } from '@/components/icon';
import {
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
};

function reportShareCopy(report: ShareableReport) {
  const completed = report.cleanup_state === 'completed';
  const title = report.title || 'Litter report';
  return {
    title,
    eyebrow: completed ? 'Cleanup complete' : 'Cleanup needed',
    message: completed
      ? `See the cleanup impact for ${title} on Litterbugs.`
      : `View ${title} and help clean it up with Litterbugs.`,
  };
}

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
  const nativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const { title, eyebrow, message } = reportShareCopy(report);
  const shareMessage = `${message}\n\n${shareUrl}`;
  const imageUrl = reportShareImageUrl(shareUrl);
  const imageFilename = reportShareImageFilename(title);
  const litterTypes = [...(report.litter_types ?? []), ...(report.types ? [report.types] : [])];
  const details = [
    report.severity ? `${report.severity} priority` : null,
    report.funded_amount_cents > 0
      ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(report.funded_amount_cents / 100)} reward`
      : null,
    litterTypes[0] ?? null,
  ].filter(Boolean).join(' · ');

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
    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback({ message: 'Link copied. Choose a destination or close this window.', tone: 'success' });
    } catch {
      setFeedback({ message: 'The link could not be copied. Try Email or another sharing option.', tone: 'error' });
    }
  }

  async function openNativeShare(destination = 'device') {
    if (!nativeShareAvailable) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback({
          message: `${destination} sharing is not available in this browser. The report link was copied instead.`,
          tone: 'success',
        });
      } catch {
        setFeedback({
          message: `${destination} sharing is not available in this browser. Try Copy link or Email.`,
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
      setFeedback({ message: 'Your device share menu could not be opened. Choose another option.', tone: 'error' });
    }
  }

  async function prepareInstagramCard() {
    downloadLinkRef.current?.click();
    try {
      await navigator.clipboard.writeText(shareMessage);
      setFeedback({
        message: 'Instagram story card downloaded and caption copied. Add the image in Instagram, then paste the caption and review your post.',
        tone: 'success',
      });
    } catch {
      setFeedback({
        message: 'Instagram story card downloaded, but the caption could not be copied. Use Copy link before posting.',
        tone: 'error',
      });
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
          <div>
            <p className={styles.eyebrow}>Share a Litterbugs report</p>
            <h2 id="report-share-title">Share this cleanup report</h2>
          </div>
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
            <span>{eyebrow}</span>
            <strong>{title}</strong>
            {details ? <small>{details}</small> : null}
          </div>
        </article>

        <div className={styles.options} aria-label="Sharing destinations">
          {nativeShareAvailable ? (
            <button className={`${styles.option} ${styles.primaryOption}`} type="button" onClick={() => { void openNativeShare(); }}>
              <span className={`${styles.optionIcon} ${styles.primaryIcon}`} aria-hidden="true"><FiShare2 /></span>
              <span className={styles.optionCopy}><strong>Share with another app</strong><span>Messages, AirDrop, Mail, and installed apps</span></span>
            </button>
          ) : null}
          <button className={styles.option} type="button" onClick={() => { void copyLink(); }}>
            <span className={`${styles.optionIcon} ${styles.copyIcon}`} aria-hidden="true">
              {feedback?.message.startsWith('Link copied') ? <FiCheck /> : <FiCopy />}
            </span>
            <span className={styles.optionCopy}>
              <strong>{feedback?.message.startsWith('Link copied') ? 'Link copied' : 'Copy link'}</strong>
              <span>Copy the public report URL</span>
            </span>
          </button>
          <a className={styles.option} href={destinationUrls.email}>
            <span className={`${styles.optionIcon} ${styles.utilityIcon}`} aria-hidden="true"><FiMail /></span>
            <span className={styles.optionCopy}><strong>Email</strong><span>Open your email app</span></span>
          </a>
          <a className={styles.option} href={destinationUrls.whatsapp} target="_blank" rel="noopener noreferrer">
            <span className={`${styles.optionIcon} ${styles.brandIcon}`} aria-hidden="true">
              <img className={styles.brandMark} src="/brand/social/whatsapp-glyph.png" alt="" />
            </span>
            <span className={styles.optionCopy}><strong>WhatsApp</strong><span>Share to a chat</span></span>
          </a>
          <a className={styles.option} href={destinationUrls.facebook} target="_blank" rel="noopener noreferrer">
            <span className={`${styles.optionIcon} ${styles.brandIcon}`} aria-hidden="true">
              <img className={styles.brandMark} src="/brand/social/facebook-logo.png" alt="" />
            </span>
            <span className={styles.optionCopy}><strong>Facebook</strong><span>Start a new post</span></span>
          </a>
          <button
            className={styles.option}
            type="button"
            onClick={() => { void prepareInstagramCard(); }}
          >
            <span className={`${styles.optionIcon} ${styles.brandIcon}`} aria-hidden="true">
              <img className={styles.brandMark} src="/brand/social/instagram-glyph.png" alt="" />
            </span>
            <span className={styles.optionCopy}>
              <strong>Instagram story card</strong>
              <span>Download the branded image and copy its caption</span>
            </span>
            <span className={styles.trailingIcon} aria-hidden="true"><FiDownload /></span>
          </button>
          <a className={styles.option} href={destinationUrls.x} target="_blank" rel="noopener noreferrer">
            <span className={`${styles.optionIcon} ${styles.brandIcon}`} aria-hidden="true">
              <img className={styles.brandMark} src="/brand/social/x-logo.png" alt="" />
            </span>
            <span className={styles.optionCopy}><strong>X</strong><span>Start a new post</span></span>
          </a>
        </div>

        <div className={styles.footer}>
          <p className={styles.privacy}>The shared page excludes exact coordinates and private account details.</p>
          <p className={`${styles.status} ${feedback?.tone === 'error' ? styles.statusError : ''}`} role="status" aria-live="polite">
            {feedback?.message ?? ''}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
