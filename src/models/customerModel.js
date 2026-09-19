import { pool } from '../config/db.js';

/**
 * Customer Model: Data access layer for customers table
 */
export const customerModel = {
  /**
   * Create a new customer
   */
  async create(
    { name, phone = '', note = '', address = '', avatarColor = 'bg-emerald-500' },
    client = pool
  ) {
    const query = `
      INSERT INTO customers (name, phone, note, address, avatar_color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, phone, note, address, avatar_color AS "avatarColor", created_at AS "createdAt";
    `;
    const result = await client.query(query, [name, phone, note, address, avatarColor]);
    return result.rows[0];
  },

  /**
   * Find customers with optional search and filters, including totalServicesCount
   */
  async findAll({ search, name, phone, note } = {}, client = pool) {
    let query = `
      SELECT id, name, phone, note, address, avatar_color AS "avatarColor", created_at AS "createdAt",
             (
               COALESCE((SELECT COUNT(*)::int FROM customer_services cs WHERE cs.customer_id = customers.id), 0)
               +
               COALESCE((SELECT COUNT(*)::int FROM service_todos st WHERE st.customer_id = customers.id), 0)
             ) AS "totalServicesCount"
      FROM customers WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR note ILIKE $${params.length} OR address ILIKE $${params.length})`;
    } else {
      if (name) {
        params.push(`%${name.trim()}%`);
        query += ` AND name ILIKE $${params.length}`;
      }
      if (phone) {
        params.push(`%${phone.trim()}%`);
        query += ` AND phone ILIKE $${params.length}`;
      }
      if (note) {
        params.push(`%${note.trim()}%`);
        query += ` AND note ILIKE $${params.length}`;
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  },

  /**
   * Find customer by primary key
   */
  async findById(id, client = pool) {
    const query = `
      SELECT id, name, phone, note, address, avatar_color AS "avatarColor", created_at AS "createdAt"
      FROM customers
      WHERE id = $1;
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Update customer fields
   */
  async update(id, fields, client = pool) {
    const updates = [];
    const params = [id];

    if (fields.name !== undefined) {
      params.push(fields.name);
      updates.push(`name = $${params.length}`);
    }
    if (fields.phone !== undefined) {
      params.push(fields.phone);
      updates.push(`phone = $${params.length}`);
    }
    if (fields.note !== undefined) {
      params.push(fields.note);
      updates.push(`note = $${params.length}`);
    }
    if (fields.address !== undefined) {
      params.push(fields.address);
      updates.push(`address = $${params.length}`);
    }
    if (fields.avatarColor !== undefined) {
      params.push(fields.avatarColor);
      updates.push(`avatar_color = $${params.length}`);
    }

    if (updates.length === 0) {
      return null;
    }

    const query = `
      UPDATE customers
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, phone, note, address, avatar_color AS "avatarColor", created_at AS "createdAt";
    `;

    const result = await client.query(query, params);
    return result.rows[0] || null;
  },

  /**
   * Delete customer by id
   */
  async deleteById(id, client = pool) {
    const query = 'DELETE FROM customers WHERE id = $1 RETURNING id;';
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },
};
