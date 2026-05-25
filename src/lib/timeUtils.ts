/**
 * Simple GMT to IST converter for ticket times
 */

/** True when the string already carries UTC/Z or a numeric offset (e.g. +00:00). */
function hasTimezoneInfo(value: string): boolean {
  const trimmed = value.trim();
  return /Z$/i.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed);
}

function parseUtcDate(dateInput: string | Date): Date | null {
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  const dateString = String(dateInput).trim();
  if (!dateString) return null;

  const candidates = hasTimezoneInfo(dateString)
    ? [dateString]
    : [dateString + 'Z', dateString + ' UTC'];

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Converts GMT timestamp to IST and formats it
 * @param dateString - GMT timestamp from database
 * @param format - 'relative' for "5 hours ago" or 'date' for formatted date
 * @param options - Date format options (only used when format='date')
 */
export const convertGMTtoIST = (
  dateString: string | Date,
  format: 'relative' | 'date' = 'relative',
  options?: Intl.DateTimeFormatOptions
) => {
  if (!dateString) return 'N/A';

  const gmtDate = parseUtcDate(dateString);
  if (!gmtDate) return 'Invalid date';

  if (format === 'date') {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata" // Force IST timezone
    };
    // Use the original GMT date but format it in IST timezone
    return gmtDate.toLocaleDateString("en-US", options ? {...options, timeZone: "Asia/Kolkata"} : defaultOptions);
  }
  
  // Relative time format - use proper timezone calculation
  const now = new Date(); // Current time
  const diffSeconds = Math.floor((now.getTime() - gmtDate.getTime()) / 1000);
  
  if (diffSeconds < 0) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds} sec ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 2592000) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffSeconds < 31536000) {
    const months = Math.floor(diffSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffSeconds / 31536000);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};
