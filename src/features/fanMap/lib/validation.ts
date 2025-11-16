import { VALIDATION } from './constants';

/**
 * Sanitize HTML to prevent XSS attacks
 * Escapes special characters that could be used for HTML injection
 */
export function sanitizeHTML(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate latitude coordinate
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' &&
         !isNaN(lat) &&
         lat >= VALIDATION.MIN_LAT &&
         lat <= VALIDATION.MAX_LAT;
}

/**
 * Validate longitude coordinate
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' &&
         !isNaN(lng) &&
         lng >= VALIDATION.MIN_LNG &&
         lng <= VALIDATION.MAX_LNG;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Validate user name
 */
export function isValidUserName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmed.length < VALIDATION.USER_NAME_MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${VALIDATION.USER_NAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > VALIDATION.USER_NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be less than ${VALIDATION.USER_NAME_MAX_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate message
 */
export function isValidMessage(message: string): { valid: boolean; error?: string } {
  if (!message) {
    return { valid: true }; // Message is optional
  }

  if (message.length > VALIDATION.MESSAGE_MAX_LENGTH) {
    return { valid: false, error: `Message must be less than ${VALIDATION.MESSAGE_MAX_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate location string
 */
export function isValidLocation(location: string): { valid: boolean; error?: string } {
  const trimmed = location.trim();

  if (!trimmed) {
    return { valid: false, error: 'Location is required' };
  }

  return { valid: true };
}

/**
 * Validate tip amount
 */
export function isValidTipAmount(tip: number | null | undefined): boolean {
  if (tip === null || tip === undefined) {
    return true; // Tips are optional
  }

  return typeof tip === 'number' && tip > 0;
}

/**
 * Check if localStorage is available and has space
 */
export function canUseLocalStorage(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safely save to localStorage with size limit handling
 */
export function safeLocalStorageSet(key: string, value: string): { success: boolean; error?: string } {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (e) {
    if (e instanceof DOMException && (
      e.code === 22 || // Most browsers
      e.code === 1014 || // Firefox
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      return { success: false, error: 'Storage quota exceeded. Please clear some data.' };
    }
    return { success: false, error: 'Failed to save data to local storage.' };
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
