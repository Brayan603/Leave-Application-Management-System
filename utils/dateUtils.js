// utils/dateUtils.js
/**
 * Counts business days between startDate and endDate (inclusive),
 * excluding weekends (Saturday & Sunday) and the supplied holiday dates.
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {string[]} holidayDates - array of "YYYY-MM-DD" strings
 * @returns {number}
 */
export const countBusinessDays = (startDate, endDate, holidayDates = []) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  const holidaySet = new Set(holidayDates);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay(); // 0 = Sun, 6 = Sat
    const iso = current.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};
