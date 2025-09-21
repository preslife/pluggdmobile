/**
 * Parse a timecode string into seconds.
 * Supports:
 * - "SS" (e.g., "42", "90")
 * - "MM:SS" (e.g., "1:23", "09:05")
 * - "HH:MM:SS" (e.g., "1:02:03")
 * Returns integer seconds or null if invalid.
 */
export const parseTimecode = (input: string): number | null => {
  if (!input) return null;
  const raw = input.trim();

  // If contains ":", treat as hh:mm:ss or mm:ss
  if (raw.includes(":")) {
    const parts = raw.split(":");
    if (parts.length < 2 || parts.length > 3) return null;

    // Ensure all parts are integers and non-negative
    const nums = parts.map((p) => {
      if (!/^\d+$/.test(p)) return NaN;
      return parseInt(p, 10);
    });
    if (nums.some((n) => Number.isNaN(n))) return null;

    let seconds = 0;
    if (nums.length === 2) {
      const [mm, ss] = nums;
      if (ss >= 60) return null; // invalid mm:ss with ss >= 60
      seconds = mm * 60 + ss;
    } else {
      const [hh, mm, ss] = nums;
      if (mm >= 60 || ss >= 60) return null;
      seconds = hh * 3600 + mm * 60 + ss;
    }
    return Math.max(0, Math.floor(seconds));
  }

  // Otherwise treat as seconds
  const sec = Number(raw);
  if (!Number.isFinite(sec) || sec < 0) return null;
  return Math.floor(sec);
};
