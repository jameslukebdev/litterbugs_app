import { describe, expect, it } from 'vitest';
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
