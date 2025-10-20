export const redirectTo = (url: string): void => {
  if (typeof window === 'undefined') return;
  if (typeof window.location !== 'undefined' && typeof window.location.assign === 'function') {
    window.location.assign(url);
  }
};
