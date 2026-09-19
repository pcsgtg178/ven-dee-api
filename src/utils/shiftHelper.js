/**
 * Shift utility functions for VenDee Shift Swap Engine
 */

/**
 * Normalizes any Date or string to YYYY-MM-DD
 * Uses Bangkok/Asia (+07:00) or local timezone representation
 * @param {Date|string} dateVal
 * @returns {string} YYYY-MM-DD
 */
export const toDateString = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(dateVal);
};

/**
 * Determines if a shift date and shift time slot has passed the current time.
 * @param {Date|string} dateVal
 * @param {'morning'|'afternoon'|'night'|null} shiftType
 * @returns {boolean}
 */
export const isShiftTimePassed = (dateVal, shiftType = null) => {
  if (!dateVal) return false;

  const shiftDateStr = toDateString(dateVal);
  const now = new Date();
  const todayStr = toDateString(now);

  // If shift date is strictly prior to today, it has definitely passed
  if (shiftDateStr < todayStr) {
    return true;
  }

  // If shift date is strictly in the future, it has not passed
  if (shiftDateStr > todayStr) {
    return false;
  }

  // If shift date is today, check by shift type hours (Standard Hospital Schedule)
  // night: 00:00 - 08:00 (ends at 08:00)
  // morning: 08:00 - 16:00 (ends at 16:00)
  // afternoon: 16:00 - 24:00 (ends at midnight)
  if (shiftType) {
    const currentHour = now.getHours();
    if (shiftType === 'night' && currentHour >= 8) {
      return true;
    }
    if (shiftType === 'morning' && currentHour >= 16) {
      return true;
    }
    // Afternoon ends at midnight, so it remains active during today
    return false;
  }

  return false;
};

/**
 * Counts active black shifts ('category = black' and 'status = active')
 * in the month of the specified target date.
 *
 * @param {import('pg').PoolClient|import('pg').Pool} dbClient
 * @param {Date|string} targetDate
 * @returns {Promise<{ count: number, blackShiftWarning: boolean, missingBlackShifts: number, month: string }>}
 */
export const countActiveBlackShiftsInMonth = async (dbClient, targetDate) => {
  const dateStr = toDateString(targetDate);
  const [yearStr, monthStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // First day of month: YYYY-MM-01
  const startOfMonth = `${yearStr}-${monthStr}-01`;
  // Last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const query = `
    SELECT COUNT(*)::int AS count
    FROM shift_todos
    WHERE category = 'black'
      AND status = 'active'
      AND date >= $1
      AND date <= $2;
  `;

  const result = await dbClient.query(query, [startOfMonth, endOfMonth]);
  const count = result.rows[0]?.count || 0;
  const isBelowQuota = count < 14;
  const missingBlackShifts = isBelowQuota ? 14 - count : 0;

  return {
    month: `${yearStr}-${monthStr}`,
    count,
    blackShiftWarning: isBelowQuota,
    missingBlackShifts,
  };
};

/**
 * Format shift row for FullCalendar or API response
 */
export const formatShiftEvent = (row) => {
  const shiftLabels = {
    morning: 'เวรเช้า',
    afternoon: 'เวรบ่าย',
    night: 'เวรดึก',
    r1: 'เวร R1 (Refer ทีม 1)',
    r2: 'เวร R2 (Refer ทีม 2)',
  };

  const categoryLabels = {
    black: 'เวรดำ',
    red: 'เวรแดง (OT)',
    green: 'เวร R (Refer)',
  };

  const dateStr = toDateString(row.date);
  const isPassed = isShiftTimePassed(row.date, row.shift);
  const isLocked = Boolean(row.is_locked || isPassed);

  let title = `ขึ้นเวร: ${shiftLabels[row.shift] || row.shift}`;
  if (row.category === 'red') {
    title += ' (เวรแดง)';
  } else if (row.category === 'green' || row.shift === 'r1' || row.shift === 'r2') {
    title += ' (เวร R)';
  }
  if (row.status === 'swapped_out') {
    title += ' [แลกออกแล้ว]';
  } else if (row.status === 'cancelled') {
    title += ' [ยกเลิก]';
  }

  const isGreen = row.category === 'green' || row.shift === 'r1' || row.shift === 'r2';
  const bgColor = isGreen ? '#16a34a' : row.category === 'red' ? '#e53e3e' : '#2b6cb0';
  const borderColor = isGreen ? '#15803d' : row.category === 'red' ? '#c53030' : '#2c5282';

  return {
    id: row.id,
    title,
    start: dateStr,
    allDay: true,
    backgroundColor: bgColor,
    borderColor: borderColor,
    isLocked,
    category: row.category,
    status: row.status,
    extendedProps: {
      type: 'shift',
      shift: row.shift,
      category: row.category,
      categoryLabel: categoryLabels[row.category] || row.category,
      status: row.status,
      isLocked,
      parentShiftId: row.parent_shift_id || null,
      swappedWith: row.swapped_with || null,
      originalOwner: row.original_owner || null,
      swapNote: row.swap_note || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
