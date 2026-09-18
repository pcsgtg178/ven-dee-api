import { pool } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * POST /api/todos/shift
 * Record shift duty
 */
export const createShiftTodo = async (req, res, next) => {
  try {
    const { shift, date } = req.body;

    const query = `
      INSERT INTO shift_todos (type, shift, date)
      VALUES ('shift', $1, $2)
      RETURNING id, type, shift, date, created_at AS "createdAt";
    `;

    const result = await pool.query(query, [shift, date]);
    const row = result.rows[0];

    // Format FullCalendar Event representation
    const shiftLabels = {
      morning: 'เวรเช้า',
      afternoon: 'เวรบ่าย',
      night: 'เวรดึก',
    };

    const formattedEvent = {
      id: row.id,
      title: `ขึ้นเวร: ${shiftLabels[row.shift] || row.shift}`,
      start: row.date,
      allDay: true,
      extendedProps: {
        type: 'shift',
        shift: row.shift,
      },
      createdAt: row.createdAt,
    };

    return sendSuccess(res, formattedEvent, 'Shift todo created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/todos/service
 * Record customer service task
 */
export const createServiceTodo = async (req, res, next) => {
  try {
    const {
      title,
      start,
      end,
      allDay = false,
      backgroundColor,
      borderColor,
      customerId,
      customerName: inputCustomerName,
      customerPhone: inputCustomerPhone,
      customerNote: inputCustomerNote,
      services,
      medicines = [],
      note = '',
    } = req.body;

    let custId = customerId || null;
    let custName = inputCustomerName || '';
    let custPhone = inputCustomerPhone || '';
    let custNote = inputCustomerNote || '';

    // If customerId is provided, enrich customer details from DB if needed
    if (custId) {
      const custRes = await pool.query(
        'SELECT name, phone, note FROM customers WHERE id = $1',
        [custId]
      );
      if (custRes.rows.length > 0) {
        const c = custRes.rows[0];
        custName = custName || c.name;
        custPhone = custPhone || c.phone;
        custNote = custNote || c.note;
      }
    }

    const eventTitle = title || (custName ? `${custName} (${services.join(', ')})` : 'บริการลูกค้า');

    const query = `
      INSERT INTO service_todos (
        title, start_time, end_time, all_day, background_color, border_color,
        customer_id, services, medicines, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, start_time AS "start", end_time AS "end", all_day AS "allDay",
                background_color AS "backgroundColor", border_color AS "borderColor",
                customer_id AS "customerId", services, medicines, note, created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      eventTitle,
      start,
      end || null,
      allDay,
      backgroundColor || '#3788d8',
      borderColor || '#3788d8',
      custId,
      services,
      medicines,
      note,
    ]);

    const row = result.rows[0];

    const formattedEvent = {
      id: row.id,
      title: row.title,
      start: row.start,
      end: row.end,
      allDay: row.allDay,
      backgroundColor: row.backgroundColor,
      borderColor: row.borderColor,
      extendedProps: {
        type: 'service',
        customerId: row.customerId,
        customerName: custName,
        customerPhone: custPhone,
        customerNote: custNote,
        services: row.services,
        medicines: row.medicines,
        note: row.note,
      },
      createdAt: row.createdAt,
    };

    return sendSuccess(res, formattedEvent, 'Service todo created successfully', 201);
  } catch (error) {
    next(error);
  }
};
