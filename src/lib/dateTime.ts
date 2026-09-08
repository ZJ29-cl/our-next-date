/**
 * Date and Time utilities for Our Next Date
 * Shared across App, Dashboard, and InteractiveTicket to eliminate formatting drift.
 */

export const getDefaultDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getIsoDate(tomorrow);
};

export const getIsoDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayIso = (): string => {
  return getIsoDate(new Date());
};

export const formatDateFriendly = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return isoDate;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

export const formatDateShort = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return isoDate;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

export const formatTimeFriendly = (timeStr: string): string => {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
};

/**
 * Checks whether a given ISO date (YYYY-MM-DD) and optional time (HH:mm)
 * is in the past compared to the current clock time.
 */
export const isPastDateTime = (dateStr: string, timeStr?: string): boolean => {
  if (!dateStr) return false;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hour = 23;
    let minute = 59;
    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      if (!isNaN(h)) hour = h;
      if (!isNaN(m)) minute = m;
    }
    const targetDate = new Date(year, month - 1, day, hour, minute, 59);
    return targetDate.getTime() < Date.now();
  } catch {
    return false;
  }
};
