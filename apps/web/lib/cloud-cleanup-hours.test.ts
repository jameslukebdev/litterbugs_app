import { expect, it, vi } from 'vitest';
import type { CloudDraft, Json } from '@litterbugs/report-contract';
import type { CleanupDraft } from './saved-cleanup-draft';

type Adapter = {
  upload: (owner: string, key: string, draft: CleanupDraft) => Promise<{ payload: Json; paths: string[] }>;
  download: (owner: string, key: string, record: CloudDraft) => Promise<CleanupDraft>;
};
const capture = vi.hoisted(() => ({ adapter: null as Adapter | null }));
vi.mock('@litterbugs/report-contract', async original => ({
  ...await original<object>(),
  createCloudDraftSync: (adapter: Adapter) => { capture.adapter = adapter; return {}; },
}));
vi.mock('./supabase/client', () => ({ createClient: vi.fn(() => { throw new Error('Unexpected network request'); }) }));
vi.mock('./saved-report-draft', () => ({}));
vi.mock('./saved-cleanup-draft', () => ({}));
import './cloud-drafts';

const record = (payload: Json): CloudDraft => ({
  user_id:'owner', draft_key:'cleanup:attempt', revision:1, mutation_id:null, request_hash:null,
  submission_id:'submission', state:'editing', updated_at:'2026-11-12T12:00:00Z', expires_at:'2099-01-01T00:00:00Z',
  photo_paths:[], payload,
});
it('round-trips decimal hours through account draft upload and restore', async () => {
  const draft: CleanupDraft = {photos:[],description:'Collected bottles',bagsOrItems:'2',weightPounds:'5',hoursSpent:'1.5'};
  const uploaded = await capture.adapter!.upload('owner','cleanup:attempt',draft);
  expect(uploaded.payload).toMatchObject({hoursSpent:'1.5'});
  const restored = await capture.adapter!.download('owner','cleanup:attempt',record(uploaded.payload));
  expect(restored).toMatchObject(draft);
});
it('restores an older account draft with empty hours', async () => {
  const restored = await capture.adapter!.download('owner','cleanup:attempt',record({version:1,kind:'cleanup',description:'Collected bottles',bagsOrItems:'2',weightPounds:'5',correctionDueAt:null}));
  expect(restored.hoursSpent).toBe('');
});
