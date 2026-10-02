import { cleanupNotificationDestination, cleanupNotificationPresentation } from './cleanupNotifications';

/** One foreground prompt per notice per mounted map session. Display is not read. */
export function createCleanupNotificationPrompt({ present, acknowledge, open, onError, isCurrent, state = { shown: new Set(), pending: false } }) {
  const shown = state.shown;
  return {
    show(notices) {
      if (state.pending || !isCurrent()) return;
      const fresh = notices.filter(notice => !shown.has(notice.id));
      if (!fresh.length) return;
      fresh.forEach(notice => shown.add(notice.id));
      state.pending = true;
      const dismiss = () => { state.pending = false; };
      const ids = fresh.map(notice => notice.id);
      const destination = fresh.length === 1 ? cleanupNotificationDestination(fresh[0]) : null;
      const act = async (navigate) => {
        if (!isCurrent()) { dismiss(); return; }
        try {
          if (navigate) await open(destination);
          if (isCurrent()) await acknowledge(ids);
        } catch (error) {
          // An unsuccessful open/read remains unread and can be offered again.
          fresh.forEach(notice => shown.delete(notice.id));
          if (isCurrent()) onError(error);
        } finally { dismiss(); }
      };
      const buttons = [
        { text: 'Later', style: 'cancel', onPress: dismiss },
        ...(destination ? [{ text: destination.label, onPress: () => act(true) }] : []),
        { text: fresh.length === 1 ? 'Mark read' : 'Mark displayed updates read', onPress: () => act(false) },
      ];
      const copy = cleanupNotificationPresentation(fresh);
      present(copy.title, copy.message, buttons, { cancelable: true, onDismiss: dismiss });
    },
  };
}
