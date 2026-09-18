import { pool } from '../config/db.js';
import { sendSuccess } from '../utils/responseHandler.js';

/**
 * GET /api/events
 * Get combined schedule events (Shift and Service) in FullCalendar Event Object format.
 * Supports date range filtering (start, end) and orders by createdAt descending.
 */
export const getEvents = async (req, res, next) => {
  try {
    const { start, end } = req.query;

    const shiftLabels = {
      morning: 'เวรเช้า',
      afternoon: 'เวรบ่าย',
      night: 'เวรดึก',
    };

    // 1. Fetch Shift Todos
    let shiftQuery = 'SELECT id, type, shift, date, created_at FROM shift_todos WHERE 1=1';
    const shiftParams = [];

    if (start) {
      shiftParams.push(start);
      shiftQuery += ` AND date >= $${shiftParams.length}`;
    }
    if (end) {
      shiftParams.push(end);
      shiftQuery += ` AND date <= $${shiftParams.length}`;
    }

    const shiftRes = await pool.query(shiftQuery, shiftParams);

    const shiftEvents = shiftRes.rows.map((row) => ({
      id: row.id,
      title: `ขึ้นเวร: ${shiftLabels[row.shift] || row.shift}`,
      start: row.date,
      allDay: true,
      extendedProps: {
        type: 'shift',
        shift: row.shift,
      },
      createdAt: row.created_at,
    }));

    // 2. Fetch Service Todos with Customer info
    let serviceQuery = `
      SELECT st.id, st.title, st.start_time, st.end_time, st.all_day,
             st.background_color, st.border_color, st.customer_id,
             st.services, st.medicines, st.note, st.created_at,
             c.name AS customer_name, c.phone AS customer_phone, c.note AS customer_note
      FROM service_todos st
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1
    `;
    const serviceParams = [];

    if (start) {
      serviceParams.push(start);
      serviceQuery += ` AND st.start_time >= $${serviceParams.length}`;
    }
    if (end) {
      serviceParams.push(end);
      serviceQuery += ` AND st.start_time <= $${serviceParams.length}`;
    }

    const serviceRes = await pool.query(serviceQuery, serviceParams);

    const serviceEvents = serviceRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      start: row.start_time,
      end: row.end_time,
      allDay: row.all_day,
      backgroundColor: row.background_color || '#3788d8',
      borderColor: row.border_color || '#3788d8',
      extendedProps: {
        type: 'service',
        customerId: row.customer_id,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        customerNote: row.customer_note || '',
        services: row.services || [],
        medicines: row.medicines || [],
        note: row.note || '',
      },
      createdAt: row.created_at,
    }));

    // 3. Combine and sort by createdAt descending (latest created first)
    const combinedEvents = [...shiftEvents, ...serviceEvents].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sendSuccess(res, combinedEvents, 'Events fetched successfully');
  } catch (error) {
    next(error);
  }
};
