'use client';
import Image from 'next/image';
import { useState } from 'react';

/** Public photo URLs recheck visibility; withdrawn images must fail gracefully. */
export function PublicPhoto({src, alt, width, height, eager = false}: {src:string;alt:string;width:number;height:number;eager?:boolean}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === src) return <span role="img" aria-label={alt ? `${alt} — photo unavailable` : 'Photo unavailable'}>Photo unavailable</span>;
  return <Image src={width <= 600 && src.startsWith('/reports/') ? `${src}?width=640` : src} alt={alt} width={width} height={height} loading={eager ? 'eager' : 'lazy'} unoptimized onError={()=>setFailedSource(src)} />;
}
