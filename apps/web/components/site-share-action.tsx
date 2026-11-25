'use client';
import { useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
export function SiteShareAction({ path,title }: {path:string;title:string}) {
  const [message,setMessage]=useState('');
  return <><button className="secondary-button" onClick={async()=>{
    const url=new URL(path,window.location.origin).toString();
    try {
      if(navigator.share) await navigator.share({title,url});
      else {await navigator.clipboard.writeText(url);setMessage('Link copied.');}
    } catch(error) {if((error as Error).name!=='AbortError')setMessage('Could not share link.');}
  }}><FiShare2 aria-hidden />Share site</button>{message && <span role="status">{message}</span>}</>;
}
