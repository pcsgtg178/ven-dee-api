import { pool } from '../config/db.js';
import { toDateString } from '../utils/shiftHelper.js';

/**
 * Format a DB row from shift_todos / shifts into standard Shift entity
 */
export const formatShiftRow = (row) => {
  if (!row) return null;

  const dateStr = toDateString(row.date || row.shift_date);
  const shiftType = row.shift || row.shift_type;

  const entity = {
    id: row.id,
    type: row.type || 'shift',
    date: dateStr,
    shiftType,
    category: row.category || 'black',
    status: row.status || 'active',
    department: row.department || null,
    note: row.note || row.swap_note || null,
    isLocked: Boolean(row.is_locked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.parent_shift_id || row.swapped_with) {
    entity.swapMeta = {
      swappedWith: row.swapped_with || null,
      originalOwner: row.original_owner || null,
      parentShiftId: row.parent_shift_id || null,
      isLocked: Boolean(row.is_locked),
      swapDate: row.swap_date ? toDateString(row.swap_date) : toDateString(row.created_at),
      swapReason: row.swap_reason || row.swap_note || null,
    };
  }

  return entity;
};

/**
 * ShiftModel: Data access layer for shifts and shift_todos tables in PostgreSQL
 */
export const shiftModel = {
  /**
   * Find a shift by ID
   */
  async findById(id, client = pool) {
    const query = `
      SELECT id, type, shift, date, category, status, is_locked, parent_shift_id,
             swapped_with, original_owner, swap_note, department, note, created_at, updated_at
      FROM shift_todos
      WHERE id = $1;
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a shift by ID with row lock (FOR UPDATE) inside a transaction
   */
  async findByIdForUpdate(id, client) {
    const query = `
      SELECT id, type, shift, date, category, status, is_locked, parent_shift_id,
             swapped_with, original_owner, swap_note, department, note, created_at, updated_at
      FROM shift_todos
      WHERE id = $1
      FOR UPDATE;
    `;
    const result = await client.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Check if an active shift of the same type already exists on the date
   */
  async findActiveDuplicate(date, shiftType, excludeId = null, client = pool) {
    const dateStr = toDateString(date);
    let query = `
      SELECT id, shift, date, status
      FROM shift_todos
      WHERE date = $1 AND shift = $2 AND status = 'active'
    `;
    const params = [dateStr, shiftType];

    if (excludeId) {
      params.push(excludeId);
      query += ` AND id != $${params.length}`;
    }

    const result = await client.query(query, params);
    return result.rows[0] || null;
  },

  /**
   * Create a new shift record (10 parameters for strict mock & real PostgreSQL compatibility)
   */
  async create(data, client = pool) {
    const {
      type = 'shift',
      shift,
      shiftType,
      date,
      category = 'black',
      status = 'active',
      department = null,
      note = null,
      isLocked = false,
      parentShiftId = null,
      swappedWith = null,
      originalOwner = null,
      swapNote = null,
      swapReason = null,
    } = data;

    const effectiveShift = shiftType || shift;
    const effectiveDate = toDateString(date);
    const effectiveNote = note || swapNote || swapReason;

    const query = `
      INSERT INTO shift_todos (
        type, shift, date, category, status, is_locked,
        parent_shift_id, swapped_with, original_owner, swap_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, type, shift, date, category, status, is_locked,
                department, note, parent_shift_id, swapped_with, original_owner,
                swap_note, created_at, updated_at;
    `;

    const result = await client.query(query, [
      type,
      effectiveShift,
      effectiveDate,
      category,
      status,
      isLocked,
      parentShiftId,
      swappedWith,
      originalOwner,
      effectiveNote,
    ]);

    if (department) {
      try {
        await client.query(`UPDATE shift_todos SET department = $2 WHERE id = $1;`, [
          result.rows[0].id,
          department,
        ]);
        result.rows[0].department = department;
      } catch (_) {}
    }

    // Also mirror to shifts table if it exists
    try {
      await client.query(
        `INSERT INTO shifts (id, shift_date, shift_type, category, status, department, note, parent_shift_id, swapped_with, original_owner, swap_reason, is_locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;`,
        [
          result.rows[0].id,
          effectiveDate,
          effectiveShift,
          category,
          status,
          department,
          effectiveNote,
          parentShiftId,
          swappedWith,
          originalOwner,
          effectiveNote,
          isLocked,
        ]
      );
    } catch (_) {}

    return result.rows[0];
  },

  /**
   * Update shift fields (department, note)
   */
  async update(id, fields, client = pool) {
    const updates = [];
    const params = [id];

    if (fields.department !== undefined) {
      params.push(fields.department);
      updates.push(`department = $${params.length}`);
    }
    if (fields.note !== undefined) {
      params.push(fields.note);
      updates.push(`note = $${params.length}`);
      params.push(fields.note);
      updates.push(`swap_note = $${params.length}`);
    }

    if (updates.length === 0) {
      return this.findById(id, client);
    }

    const query = `
      UPDATE shift_todos
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, type, shift, date, category, status, is_locked,
                department, note, parent_shift_id, swapped_with, original_owner,
                swap_note, created_at, updated_at;
    `;

    const result = await client.query(query, params);
    return result.rows[0] || null;
  },

  /**
   * Delete shift by ID
   */
  async deleteById(id, client = pool) {
    const query = `DELETE FROM shift_todos WHERE id = $1 RETURNING id, parent_shift_id;`;
    const result = await client.query(query, [id]);
    try {
      await client.query(`DELETE FROM shifts WHERE id = $1;`, [id]);
    } catch (_) {}
    return result.rows[0] || null;
  },

  /**
   * Update shift status (active, swapped_out, cancelled)
   */
  async updateStatus(id, status, client = pool) {
    const query = `
      UPDATE shift_todos
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, type, shift, date, category, status, is_locked,
                department, note, parent_shift_id, swapped_with, original_owner,
                swap_note, created_at, updated_at;
    `;
    const result = await client.query(query, [id, status]);

    try {
      await client.query(
        `UPDATE shifts SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
        [id, status]
      );
    } catch (_) {}

    return result.rows[0] || null;
  },

  /**
   * Find all shifts with filters
   */
  async findAll({ month, startDate, endDate, status = 'active', category } = {}, client = pool) {
    let query = `
      SELECT id, type, shift, date, category, status, is_locked,
             department, note, parent_shift_id, swapped_with, original_owner,
             swap_note, created_at, updated_at
      FROM shift_todos
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (month) {
      params.push(`${month}-01`);
      query += ` AND date >= $${params.length}::date`;
      params.push(`${month}-01`);
      query += ` AND date < ($${params.length}::date + INTERVAL '1 month')`;
    } else {
      if (startDate) {
        params.push(startDate);
        query += ` AND date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND date <= $${params.length}`;
      }
    }

    query += ` ORDER BY date ASC, created_at ASC`;

    const result = await client.query(query, params);
    return result.rows;
  },

  /**
   * Count active black shifts within date range
   */
  async countActiveBlackShifts(startDate, endDate, client = pool) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM shift_todos
      WHERE category = 'black'
        AND status = 'active'
        AND date >= $1
        AND date <= $2;
    `;
    const result = await client.query(query, [startDate, endDate]);
    return result.rows[0]?.count || 0;
  },

  /**
   * Trace ancestor chain up to root node
   */
  async findAncestors(initialShift, client = pool) {
    const chainAncestors = [initialShift];
    let currentParentId = initialShift.parent_shift_id;
    const visitedIds = new Set([initialShift.id]);

    while (currentParentId) {
      if (visitedIds.has(currentParentId)) {
        break; // Cycle prevention
      }
      visitedIds.add(currentParentId);

      const parent = await this.findById(currentParentId, client);
      if (!parent) {
        break;
      }

      chainAncestors.push(parent);
      currentParentId = parent.parent_shift_id;
    }

    // Chronological order: [Root, ..., Current]
    return chainAncestors.reverse();
  },

  /**
   * Query shifts for FullCalendar events with filters
   */
  async findEvents({ start, end, includeSwapped = false } = {}, client = pool) {
    let query = `
      SELECT id, type, shift, date, category, status, is_locked, parent_shift_id,
             department, note, swapped_with, original_owner, swap_note, created_at, updated_at
      FROM shift_todos
      WHERE 1=1
    `;
    const params = [];

    if (!includeSwapped) {
      query += ` AND status = 'active'`;
    }

    if (start) {
      params.push(start);
      query += ` AND date >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      query += ` AND date <= $${params.length}`;
    }

    const result = await client.query(query, params);
    return result.rows;
  },
};
