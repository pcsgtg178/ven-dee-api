import { pool } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * POST /api/customers
 * Create a new customer
 */
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, note } = req.body;

    const query = `
      INSERT INTO customers (name, phone, note)
      VALUES ($1, $2, $3)
      RETURNING id, name, phone, note, created_at AS "createdAt";
    `;
    const result = await pool.query(query, [name, phone || '', note || '']);

    return sendSuccess(res, result.rows[0], 'Customer created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customers
 * Get/Search customers (query params: search, name, phone, note)
 */
export const getCustomers = async (req, res, next) => {
  try {
    const { search, name, phone, note } = req.query;

    let query = 'SELECT id, name, phone, note, created_at AS "createdAt" FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR note ILIKE $${params.length})`;
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

    const result = await pool.query(query, params);
    return sendSuccess(res, result.rows, 'Customers fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customers/:id
 * Get customer detail, service history, and appointments
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customerRes = await pool.query(
      'SELECT id, name, phone, note, created_at AS "createdAt" FROM customers WHERE id = $1',
      [id]
    );

    if (customerRes.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    const customer = customerRes.rows[0];

    // Fetch service history
    const serviceHistoryRes = await pool.query(
      `SELECT id, title, start_time AS "start", end_time AS "end", all_day AS "allDay",
              background_color AS "backgroundColor", border_color AS "borderColor",
              services, medicines, note, created_at AS "createdAt"
       FROM service_todos
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Fetch appointments
    const appointmentsRes = await pool.query(
      `SELECT id, customer_id AS "customerId", appointment_date AS "appointmentDate",
              services, medicines, note, status, created_at AS "createdAt"
       FROM appointments
       WHERE customer_id = $1
       ORDER BY appointment_date DESC`,
      [id]
    );

    const data = {
      ...customer,
      servicesHistory: serviceHistoryRes.rows,
      appointments: appointmentsRes.rows,
    };

    return sendSuccess(res, data, 'Customer detail fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/customers/:id
 * Update customer details
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, note } = req.body;

    const checkRes = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    const updates = [];
    const params = [id];

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    if (phone !== undefined) {
      params.push(phone);
      updates.push(`phone = $${params.length}`);
    }
    if (note !== undefined) {
      params.push(note);
      updates.push(`note = $${params.length}`);
    }

    if (updates.length === 0) {
      return sendError(res, 'No fields provided for update', 400);
    }

    const query = `
      UPDATE customers
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, name, phone, note, created_at AS "createdAt";
    `;

    const result = await pool.query(query, params);
    return sendSuccess(res, result.rows[0], 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/customers/:id
 * Delete a customer
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    return sendSuccess(res, { id }, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/customers/:id/appointments
 * Create advance appointment for customer
 */
export const createCustomerAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { appointmentDate, services, medicines, note } = req.body;

    // Check if customer exists
    const customerRes = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (customerRes.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    const query = `
      INSERT INTO appointments (customer_id, appointment_date, services, medicines, note, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, customer_id AS "customerId", appointment_date AS "appointmentDate",
                services, medicines, note, status, created_at AS "createdAt";
    `;

    const result = await pool.query(query, [
      id,
      appointmentDate,
      services,
      medicines || [],
      note || '',
    ]);

    return sendSuccess(res, result.rows[0], 'Appointment created successfully', 201);
  } catch (error) {
    next(error);
  }
};
