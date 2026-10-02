export type NotificationView = { filter: 'all' | 'unread'; page: number };
export function notificationView(input: { filter?: string; page?: string }): NotificationView {
  const requested = Number(input.page);
  return { filter: input.filter === 'unread' ? 'unread' : 'all', page: Number.isSafeInteger(requested) && requested > 0 && requested <= Math.floor(Number.MAX_SAFE_INTEGER / 50) ? requested : 1 };
}
export function notificationViewQuery(view: NotificationView) {
  const query = new URLSearchParams();
  if (view.filter === 'unread') query.set('filter', 'unread');
  if (view.page > 1) query.set('page', String(view.page));
  return query;
}
export function notificationInboxHref(view: NotificationView, notice?: string) {
  const query = notificationViewQuery(view).toString();
  return `/account/notifications${query ? `?${query}` : ''}${notice ? `#notification-${encodeURIComponent(notice)}` : ''}`;
}
