export class OperationTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OperationTimeoutError';
  }
}

export function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new OperationTimeoutError(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
