const DEFAULT_FACEBOOK_APP_ID = '1477683410862512';

export type ReportShareDestinationInput = {
  message: string;
  shareUrl: string;
  title: string;
};

export function reportShareImageUrl(shareUrl: string) {
  if (!shareUrl) return '';
  const url = new URL(shareUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/share-image`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function reportShareImageFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return `litterbugs-${slug || 'cleanup-report'}.png`;
}

export function reportShareDestinationUrls({ message, shareUrl, title }: ReportShareDestinationInput) {
  const shareMessage = `${message}\n\n${shareUrl}`;
  const encodedMessage = encodeURIComponent(shareMessage);
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() || DEFAULT_FACEBOOK_APP_ID;

  return {
    email: `mailto:?subject=${encodeURIComponent(`${title} | Litterbugs`)}&body=${encodedMessage}`,
    facebook: `https://www.facebook.com/dialog/share?app_id=${encodeURIComponent(facebookAppId)}&display=popup&href=${encodeURIComponent(shareUrl)}&hashtag=${encodeURIComponent('#Litterbugs')}`,
    messages: `sms:?body=${encodedMessage}`,
    whatsapp: `https://wa.me/?text=${encodedMessage}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}&hashtags=Litterbugs`,
  };
}
