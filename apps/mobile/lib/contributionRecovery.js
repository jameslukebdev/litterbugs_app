import * as SecureStore from 'expo-secure-store';
const key = (userId, reportId) => `cleanup-payment.${userId}.${reportId}`;
let queue = Promise.resolve();
const serialized = (operation) => {
  const result = queue.catch(() => {}).then(operation);
  queue = result;
  return result;
};
export function savePaymentAttempt(userId, reportId, value, { updating = false } = {}) {
  return serialized(async () => {
    const raw = await SecureStore.getItemAsync(key(userId, reportId));
    const existing = raw ? JSON.parse(raw) : null;
    if ((updating && !existing) || (existing && existing.clientRequestId !== value.clientRequestId)) {
      throw new Error('Your saved payment changed. Return to this report to refresh its status.');
    }
    await SecureStore.setItemAsync(key(userId, reportId), JSON.stringify(value));
  });
}
export function clearPaymentAttempt(userId, reportId, expectedRequestId) {
  return serialized(async () => {
    if (expectedRequestId) {
      const raw = await SecureStore.getItemAsync(key(userId, reportId));
      if (!raw || JSON.parse(raw).clientRequestId !== expectedRequestId) return;
    }
    await SecureStore.deleteItemAsync(key(userId, reportId));
  });
}
export function loadPaymentAttempt(userId, reportId) {
  return serialized(async () => {
    const value = await SecureStore.getItemAsync(key(userId, reportId));
    return value ? JSON.parse(value) : null;
  });
}
export function paymentRecoveryState(status) {
  if (['succeeded', 'paid_out'].includes(status)) return 'received';
  if (['refund_pending', 'refund_processing', 'refunded'].includes(status)) return 'refund';
  if (status === 'failed') return 'failed';
  return 'pending';
}
