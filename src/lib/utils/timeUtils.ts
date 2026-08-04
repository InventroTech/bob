/**
 * Simple GMT to IST converter for ticket times
 */

/**
 * Converts GMT timestamp to IST and formats it
 * @param dateString - GMT timestamp from database
 * @param format - 'relative' for "5 hours ago" or 'date' for formatted date
 * @param options - Date format options (only used when format='date')
 */
export const convertGMTtoIST = (
  dateString: string, 
  format: 'relative' | 'date' = 'relative',
  options?: Intl.DateTimeFormatOptions
) => {
  if (!dateString) return 'N/A';
  
  // Parse GMT timestamp and add IST offset (+5:30)
  let gmtDate = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
  if (isNaN(gmtDate.getTime())) {
    gmtDate = new Date(dateString + ' UTC');
  }
  if (isNaN(gmtDate.getTime())) return 'Invalid date';
  
  // Convert to IST (GMT + 5.5 hours)
  const istDate = new Date(gmtDate.getTime() + (5.5 * 60 * 60 * 1000));
  
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

/**
 * Format a date-only value (YYYY-MM-DD) as a calendar day without timezone shift.
 * Example: 2026-07-24 → "24 JULY 2026"
 * Full timestamps still go through convertGMTtoIST.
 */
export const formatCalendarDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const trimmed = String(dateString).trim();
  const toUpperMonth = (formatted: string) =>
    String(formatted)
      .replace(/,?\s*\d{1,2}:\d{2}.*$/, '')
      .trim()
      .replace(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
        (m) => m.toUpperCase()
      );

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const local = new Date(year, month, day);
    if (Number.isNaN(local.getTime())) return 'Invalid date';
    return toUpperMonth(
      local.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }
  const formatted = convertGMTtoIST(trimmed, 'date', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return toUpperMonth(String(formatted)) || formatted;
};
