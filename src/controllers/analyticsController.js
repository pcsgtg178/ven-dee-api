import { pool } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { toDateString } from '../utils/shiftHelper.js';

export const getMonthlyQuota = async (req, res, next) => {
  try {
    const month = req.query.month || toDateString(new Date()).substring(0, 7);
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    const startOfMonth = `${yearStr}-${monthStr}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endOfMonth = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const query = `
      SELECT 
        COUNT(CASE WHEN category = 'black' AND status = 'active' THEN 1 END)::int AS "blackCount",
        COUNT(CASE WHEN category = 'red' AND status = 'active' THEN 1 END)::int AS "redCount"
      FROM shift_todos
      WHERE date >= $1 AND date <= $2;
    `;

    const result = await pool.query(query, [startOfMonth, endOfMonth]);
    const { blackCount, redCount } = result.rows[0] || { blackCount: 0, redCount: 0 };

    const quota = 14;
    const remaining = Math.max(0, quota - blackCount);
    const isMet = blackCount >= quota;
    const percentage = Math.min(100, Math.round((blackCount / quota) * 100));

    return sendSuccess(
      res,
      {
        month,
        blackCount,
        redCount,
        quota,
        remaining,
        isMet,
        percentage,
      },
      'ดึงสถิติโควต้าเวรดำประจำเดือนสำเร็จ'
    );
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};
