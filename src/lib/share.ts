export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export const canNativeShare = () => typeof navigator.share === 'function';

/** Resolves false only when the share sheet couldn't open, so callers can fall back; a user cancel counts as handled. */
export async function nativeShare(data: ShareData) {
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    return (err as DOMException).name === 'AbortError';
  }
}

export const copyText = (text: string) => navigator.clipboard.writeText(text);
