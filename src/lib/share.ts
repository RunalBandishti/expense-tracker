export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export const canNativeShare = () => typeof navigator.share === 'function';

/** Opens the system share sheet; resolves false if it was dismissed or blocked. */
export async function nativeShare(data: ShareData) {
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export const copyText = (text: string) => navigator.clipboard.writeText(text);
