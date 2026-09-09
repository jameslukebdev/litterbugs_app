import AsyncStorage from '@react-native-async-storage/async-storage';
const TTL = 5 * 60 * 1000;
const key = (userId, id) => `payment-check:v1:${userId}:${id}`;
export async function savePaymentVerification(userId, item, verification, now = Date.now()) {
  if (!userId || !item?.id) return;
  try {
    await AsyncStorage.setItem(key(userId, item.id), JSON.stringify({
      providerState: verification.providerState, checkedAt: verification.checkedAt,
      expiresAt: now + TTL,
    }));
  } catch { /* The server result is still usable if local storage is unavailable. */ }
}
export async function withPaymentVerification(userId, item, now = Date.now()) {
  if (!userId || !item?.id) return item;
  try {
    const storageKey = key(userId, item.id);
    if (item.status !== 'payment_pending') { await AsyncStorage.removeItem(storageKey); return item; }
    const snapshot = JSON.parse(await AsyncStorage.getItem(storageKey) || 'null');
    if (snapshot?.expiresAt > now) return { ...item, providerState: snapshot.providerState, checkedAt: snapshot.checkedAt };
    if (snapshot) await AsyncStorage.removeItem(storageKey);
  } catch { /* Never infer a payment outcome from a local storage failure. */ }
  return item;
}
