import { pool } from '../config/db.js';

/**
 * Appointment Model: Data access layer for appointments table
 */
export const appointmentModel = {
  /**
   * Create an appointment
   */
  async create(
    { customerId, appointmentDate, services, medicines = [], note = '', status = 'pending' },
    client = pool
  ) {
    const query = `
      INSERT INTO appointments (customer_id, appointment_date, services, medicines, note, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, customer_id AS "customerId", appointment_date AS "appointmentDate",
                services, medicines, note, status, created_at AS "createdAt";
    `;

    const result = await client.query(query, [
      customerId,
      appointmentDate,
      services,
      medicines,
      note,
      status,
    ]);

    return result.rows[0];
  },

  /**
   * Find appointments by customer ID
   */
  async findByCustomerId(customerId, client = pool) {
    const query = `
      SELECT id, customer_id AS "customerId", appointment_date AS "appointmentDate",
             services, medicines, note, status, created_at AS "createdAt"
      FROM appointments
      WHERE customer_id = $1
      ORDER BY appointment_date DESC;
    `;
    const result = await client.query(query, [customerId]);
    return result.rows;
  },
};
