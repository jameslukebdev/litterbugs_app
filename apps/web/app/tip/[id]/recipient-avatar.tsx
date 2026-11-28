'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiUser } from 'react-icons/fi';
import styles from '../tip.module.css';

export function RecipientAvatar({ name, url }: { name?: string | null; url: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const initial = Array.from(name?.replace(/^@/, '').trim() ?? '')[0]?.toUpperCase();
  return (
    <span className={styles.avatar} aria-hidden="true">
      {url && url !== failedUrl
        ? <Image src={url} alt="" width={60} height={60} unoptimized referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
        : initial || <FiUser size={26} />}
    </span>
  );
}
