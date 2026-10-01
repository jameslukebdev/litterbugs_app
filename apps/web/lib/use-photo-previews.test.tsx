// @vitest-environment jsdom
import { StrictMode } from 'react';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePhotoPreviews } from './use-photo-previews';
afterEach(cleanup);
it('keeps displayed object URLs valid through Strict Mode replay and releases them on unmount',async()=>{
  let sequence=0; const revoked=new Set<string>();
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=>`blob:${++sequence}`)});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn((url:string)=>revoked.add(url))});
  const files=[new File(['photo'],'photo.jpg')];
  const {result,unmount}=renderHook(()=>usePhotoPreviews(files),{wrapper:StrictMode});
  await waitFor(()=>expect(result.current).toHaveLength(1));
  const visible=result.current[0];expect(revoked.has(visible)).toBe(false);
  unmount();expect(revoked.has(visible)).toBe(true);
});
