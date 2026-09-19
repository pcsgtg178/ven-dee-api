import { pool } from '../config/db.js';
import { AppError } from '../utils/responseHandler.js';
import { toDateString } from '../utils/shiftHelper.js';

export const SHIFT_TIME_RANGES = {
  morning: { label: 'เวรเช้า', period: '08:00 - 16:00', start: '08:00', end: '16:00' },
  afternoon: { label: 'เวรบ่าย', period: '16:00 - 24:00', start: '16:00', end: '24:00' },
  night: { label: 'เวรดึก', period: '00:00 - 08:00', start: '00:00', end: '08:00' },
  r1: { label: 'เวร R1 (Refer ทีม 1)', period: '24 ชม.', exempt: true },
  r2: { label: 'เวร R2 (Refer ทีม 2)', period: '24 ชม.', exempt: true },
};

/**
 * Normalizes time string to HH:MM format
 * @param {string|Date} timeVal
 * @returns {string} e.g. "14:00"
 */
export const normalizeTime = (timeVal) => {
  if (!timeVal) return '';
  if (timeVal instanceof Date) {
    const hours = String(timeVal.getHours()).padStart(2, '0');
    const minutes = String(timeVal.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  const str = String(timeVal).trim();
  // Handle ISO timestamp like 2026-09-20T14:00:00Z
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    return timePart.substring(0, 5);
  }
  // Handle HH:MM:SS or HH:MM
  return str.substring(0, 5);
};

/**
 * Checks if a specific time falls within a hospital shift period.
 * R1 and R2 shifts are strictly exempt and return false.
 *
 * @param {string} timeStr - "HH:MM"
 * @param {string} shiftType - 'morning' | 'afternoon' | 'night' | 'r1' | 'r2'
 * @returns {boolean}
 */
export const isTimeInShift = (timeStr, shiftType) => {
  if (!timeStr || !shiftType) return false;
  if (shiftType === 'r1' || shiftType === 'r2') return false;

  const time = normalizeTime(timeStr);

  if (shiftType === 'morning') {
    return time >= '08:00' && time < '16:00';
  }
  if (shiftType === 'afternoon') {
    return time >= '16:00' && time <= '23:59';
  }
  if (shiftType === 'night') {
    return (time >= '00:00' && time < '08:00') || time === '24:00';
  }

  return false;
};

export const conflictService = {
  isTimeInShift,

  /**
   * Check if booking a customer service on date and time conflicts with hospital shifts.
   * Throws 409 CONFLICT_WITH_SHIFT if conflict found.
   */
  async checkServiceConflictWithShifts(date, time, dbClient = pool) {
    const dateStr = toDateString(date);
    const normalizedTime = normalizeTime(time);

    // Query active hospital shifts on that date from shifts and shift_todos
    const query = `
      SELECT id, shift_type AS shift, category, status
      FROM shifts
      WHERE shift_date = $1 AND status = 'active'
      UNION
      SELECT id, shift, category, status
      FROM shift_todos
      WHERE date = $1 AND status = 'active';
    `;

    const result = await dbClient.query(query, [dateStr]);
    const activeShifts = result.rows;

    for (const s of activeShifts) {
      const sType = s.shift || s.shift_type;
      if (isTimeInShift(normalizedTime, sType)) {
        const info = SHIFT_TIME_RANGES[sType] || { label: sType, period: '' };
        const message = `เวลา ${normalizedTime} น. ตรงกับช่วงเวลา${info.label} (${info.period}) ที่ขึ้นเวรอยู่ ไม่สามารถนัดหมายทับเวลาเวรได้`;
        throw new AppError(message, 409, 'CONFLICT_WITH_SHIFT', [
          {
            field: 'service_time',
            issue: `เวลา ${normalizedTime} น. ตรงกับช่วงเวลา${info.label} (${info.period})`,
          },
        ]);
      }
    }
  },

  /**
   * Check if creating or receiving a shift on date conflicts with existing customer services.
   * R1 and R2 are exempt.
   * Throws 409 CONFLICT_WITH_SERVICE if conflict found.
   */
  async checkShiftConflictWithServices(date, shiftType, dbClient = pool) {
    if (shiftType === 'r1' || shiftType === 'r2') {
      return; // R shifts are exempt from conflicts
    }

    const dateStr = toDateString(date);

    // Query active/upcoming customer services on that date
    const query = `
      SELECT cs.id, cs.service_time::text AS service_time, cs.status, c.name AS customer_name
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE cs.service_date = $1 AND cs.status != 'cancelled'
      UNION
      SELECT st.id, st.start_time::text AS service_time, 'upcoming' AS status, c.name AS customer_name
      FROM service_todos st
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE st.start_time::date = $1;
    `;

    const result = await dbClient.query(query, [dateStr]);
    const services = result.rows;

    for (const srv of services) {
      const srvTime = normalizeTime(srv.service_time);
      if (isTimeInShift(srvTime, shiftType)) {
        const info = SHIFT_TIME_RANGES[shiftType] || { label: shiftType, period: '' };
        const custName = srv.customer_name ? `คุณ ${srv.customer_name}` : 'ลูกค้า';
        const message = `ไม่สามารถลงเวรหรือแลกมารับ${info.label} (${info.period}) ในวันที่ ${dateStr} ได้ เนื่องจากมีนัดหมายบริการ "${custName}" เวลา ${srvTime} น. อยู่แล้ว`;
        throw new AppError(message, 409, 'CONFLICT_WITH_SERVICE', [
          {
            field: 'shift_time',
            issue: `เวลาของ${info.label} (${info.period}) ชนกับนัดหมายบริการเวลา ${srvTime} น.`,
          },
        ]);
      }
    }
  },
};
