import { pool } from '../config/db.js';

/**
 * ServiceTodo Model: Data access layer for service_todos table
 */
export const serviceTodoModel = {
  /**
   * Create a new service todo
   */
  async create(data, client = pool) {
    const {
      title,
      start,
      end = null,
      allDay = false,
      backgroundColor = '#3788d8',
      borderColor = '#3788d8',
      customerId = null,
      services = [],
      medicines = [],
      note = '',
    } = data;

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

    const result = await client.query(query, [
      title,
      start,
      end,
      allDay,
      backgroundColor,
      borderColor,
      customerId,
      services,
      medicines,
      note,
    ]);

    return result.rows[0];
  },

  /**
   * Find service history by customer id
   */
  async findByCustomerId(customerId, client = pool) {
    const query = `
      SELECT id, title, start_time AS "start", end_time AS "end", all_day AS "allDay",
             background_color AS "backgroundColor", border_color AS "borderColor",
             services, medicines, note, created_at AS "createdAt"
      FROM service_todos
      WHERE customer_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await client.query(query, [customerId]);
    return result.rows;
  },

  /**
   * Find service todos with joined customer information for calendar events
   */
  async findEvents({ start, end } = {}, client = pool) {
    let query = `
      SELECT st.id, st.title, st.start_time, st.end_time, st.all_day,
             st.background_color, st.border_color, st.customer_id,
             st.services, st.medicines, st.note, st.created_at,
             c.name AS customer_name, c.phone AS customer_phone, c.note AS customer_note
      FROM service_todos st
      LEFT JOIN customers c ON st.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      params.push(start);
      query += ` AND st.start_time >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      query += ` AND st.start_time <= $${params.length}`;
    }

    const result = await client.query(query, params);
    return result.rows;
  },
};
