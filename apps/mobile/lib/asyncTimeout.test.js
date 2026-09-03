import { describe, expect, it, vi } from 'vitest';

import { OperationTimeoutError, withTimeout } from './asyncTimeout';

describe('withTimeout', () => {
  it('returns a result that finishes before the deadline', async () => {
    await expect(withTimeout(Promise.resolve('done'), 100, 'too slow')).resolves.toBe('done');
  });

  it('rejects a stalled operation with a user-facing timeout', async () => {
    vi.useFakeTimers();
    const result = withTimeout(new Promise(() => {}), 100, 'This is taking too long.');
    const rejection = expect(result).rejects.toEqual(expect.objectContaining({
      name: 'OperationTimeoutError',
      message: 'This is taking too long.',
    }));
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(new OperationTimeoutError('timeout')).toBeInstanceOf(Error);
    vi.useRealTimers();
  });
});
