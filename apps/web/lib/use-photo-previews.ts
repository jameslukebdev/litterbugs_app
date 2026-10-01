'use client';
import { useEffect, useState } from 'react';
export function usePhotoPreviews(files: readonly File[]) {
  const [previews,setPreviews] = useState<{files:readonly File[];urls:string[]}>();
  useEffect(()=>{
    const next=files.map(file=>URL.createObjectURL(file)); let active=true;
    queueMicrotask(()=>{if(active)setPreviews({files,urls:next});});
    return ()=>{active=false;next.forEach(url=>URL.revokeObjectURL(url));};
  },[files]);
  return previews?.files===files ? previews.urls : [];
}
