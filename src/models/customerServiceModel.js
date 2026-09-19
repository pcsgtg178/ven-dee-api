import { pool } from '../config/db.js';
import { toDateString } from '../utils/shiftHelper.js';

/**
 * CustomerServiceModel: Data access layer for customer_services table in PostgreSQL
 */
export const customerServiceModel = {
  /**
   * Create a new customer service record
   */
  async create(data, client = pool) {
    const {
      customerId = null,
      serviceDate,
      serviceTime,
      serviceTypes = [],
      otherServiceText = null,
      medications = [],
      note = '',
      status = 'upcoming',
      price = 0.0,
    } = data;

    const dateStr = toDateString(serviceDate);

    const query = `
      INSERT INTO customer_services (
        customer_id, service_date, service_time, service_types,
        other_service_text, medications, note, status, price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, customer_id AS "customerId", service_date::text AS "date",
                LEFT(service_time::text, 5) AS "time", service_types AS "services",
                other_service_text AS "otherServiceText", medications,
                note, status, price::float AS price, created_at AS "createdAt",
                updated_at AS "updatedAt";
    `;

    const result = await client.query(query, [
      customerId,
      dateStr,
      serviceTime,
      JSON.stringify(serviceTypes),
      otherServiceText,
      JSON.stringify(medications),
      note,
      status,
      price,
    ]);

    return result.rows[0];
  },

  /**
   * Find a service by ID with joined customer details
   */
  async findById(id, client = pool) {
    const query = `
      SELECT cs.id, cs.customer_id AS "customerId", cs.service_date::text AS "date",
             LEFT(cs.service_time::text, 5) AS "time", cs.service_types AS "services",
             cs.other_service_text AS "otherServiceText", cs.medications,
             cs.note, cs.status, cs.price::float AS price, cs.created_at AS "createdAt",
             cs.updated_at AS "updatedAt",
             c.name AS "customerName", c.phone AS "customerPhone", c.note AS "customerNote",
             c.address AS "customerAddress", c.avatar_color AS "avatarColor"
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE cs.id = $1;
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Update service status
   */
  async updateStatus(id, status, client = pool) {
    const query = `
      UPDATE customer_services
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, customer_id AS "customerId", service_date::text AS "date",
                LEFT(service_time::text, 5) AS "time", service_types AS "services",
                medications, note, status, price::float AS price,
                created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const result = await client.query(query, [id, status]);
    return result.rows[0] || null;
  },

  /**
   * Delete customer service by ID
   */
  async deleteById(id, client = pool) {
    const query = `DELETE FROM customer_services WHERE id = $1 RETURNING id;`;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find services with optional filters
   */
  async findAll({ customerId, month, startDate, endDate, status } = {}, client = pool) {
    let query = `
      SELECT cs.id, cs.customer_id AS "customerId", cs.service_date::text AS "date",
             LEFT(cs.service_time::text, 5) AS "time", cs.service_types AS "services",
             cs.other_service_text AS "otherServiceText", cs.medications,
             cs.note, cs.status, cs.price::float AS price, cs.created_at AS "createdAt",
             cs.updated_at AS "updatedAt",
             c.name AS "customerName", c.phone AS "customerPhone", c.note AS "customerNote"
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      params.push(customerId);
      query += ` AND cs.customer_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND cs.status = $${params.length}`;
    }

    if (month) {
      params.push(`${month}-01`);
      query += ` AND cs.service_date >= $${params.length}::date`;
      params.push(`${month}-01`);
      query += ` AND cs.service_date < ($${params.length}::date + INTERVAL '1 month')`;
    } else {
      if (startDate) {
        params.push(startDate);
        query += ` AND cs.service_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND cs.service_date <= $${params.length}`;
      }
    }

    query += ` ORDER BY cs.service_date ASC, cs.service_time ASC`;

    const result = await client.query(query, params);
    return result.rows;
  },
};
