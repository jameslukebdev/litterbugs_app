import { describe, expect, it, vi } from 'vitest';
import { submitRecoverableReport } from './reportSubmission';
for (const boundary of ['reserve', 'upload', 'publish']) {
  it(`resumes the same report after losing the ${boundary} response`, async () => {
    let saved, record, failed = false, uploads = 0;
    const initial = { id: 'stable-id', payload: {}, photos: ['a','b'], paths: [] };
    const deps = {
      persist: async value => { saved = structuredClone(value); },
      reserve: async id => {
        record ||= { id, is_published: false };
        if (boundary === 'reserve' && !failed) { failed = true; throw Error('lost response'); }
        return record;
      },
      upload: async uri => {
        uploads++;
        if (boundary === 'upload' && !failed && uri === 'b') { failed = true; throw Error('offline'); }
        return 'safe/'+uri;
      },
      publish: async (id, paths) => {
        record = { id, is_published: true, photo_paths: paths };
        if (boundary === 'publish' && !failed) { failed = true; throw Error('lost response'); }
        return record;
      },
    };
    await expect(submitRecoverableReport({ ...deps, journal: initial })).rejects.toThrow();
    const result = await submitRecoverableReport({ ...deps, journal: saved });
    expect(result).toEqual({ id: 'stable-id', is_published: true, photo_paths: ['safe/a','safe/b'] });
    expect(uploads).toBe(boundary === 'upload' ? 3 : 2);
  });
}
it('does not send a request until the local identity is durable', async () => {
  let requests = 0;
  await expect(submitRecoverableReport({ journal: {}, persist: async () => { throw Error('disk full'); }, reserve: async () => { requests++; } })).rejects.toThrow('disk full');
  expect(requests).toBe(0);
});

it('uploads concurrently, preserves photo order, and serializes recovery journal writes', async () => {
  let releaseFirst, active = 0, maxActive = 0, writing = 0;
  const first = new Promise(resolve => { releaseFirst = resolve; });
  const snapshots = [];
  const operation = submitRecoverableReport({
    journal: { id: 'id', photos: ['a', 'b', 'c'], paths: [] },
    persist: async journal => {
      expect(writing++).toBe(0);
      await Promise.resolve();
      snapshots.push(structuredClone(journal));
      writing--;
    },
    reserve: async () => ({ is_published: false }),
    upload: async photo => {
      maxActive = Math.max(maxActive, ++active);
      if (photo === 'a') await first;
      active--;
      return photo;
    },
    publish: async (id, paths) => paths,
  });
  // Photo c finishes while a is still uploading.
  await vi.waitFor(() => expect(snapshots.at(-1).paths).toEqual([undefined, 'b', 'c']));
  releaseFirst();
  expect(await operation).toEqual(['a', 'b', 'c']);
  expect(maxActive).toBe(2);
  expect(snapshots.at(-1).paths).toEqual(['a', 'b', 'c']);
});

it('keeps a later successful photo when an earlier concurrent upload fails', async () => {
  let saved;
  let fail = true;
  const upload = vi.fn(async photo => {
    if (photo === 'a' && fail) throw Error('offline');
    return photo;
  });
  const deps = {
    persist: async journal => { saved = structuredClone(journal); },
    reserve: async () => ({ is_published: false }), upload,
    publish: async (id, paths) => paths,
  };
  await expect(submitRecoverableReport({ ...deps, journal: { id: 'id', photos: ['a','b'], paths: [] } })).rejects.toThrow('offline');
  expect(saved.paths).toEqual([undefined, 'b']);
  fail = false;
  expect(await submitRecoverableReport({ ...deps, journal: saved })).toEqual(['a','b']);
  expect(upload.mock.calls).toEqual([['a','id'],['b','id'],['a','id']]);
});
