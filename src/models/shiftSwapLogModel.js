import { pool } from '../config/db.js';

/**
 * ShiftSwapLog Model: Data access layer for shift_swap_logs table
 */
export const shiftSwapLogModel = {
  /**
   * Create a swap audit log entry
   */
  async create(data, client = pool) {
    const {
      action,
      sourceShiftId,
      targetShiftId,
      swappedWith = null,
      originalOwner = null,
      note = null,
    } = data;

    const query = `
      INSERT INTO shift_swap_logs (
        action, source_shift_id, target_shift_id,
        swapped_with, original_owner, note, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, action, source_shift_id, target_shift_id,
                swapped_with, original_owner, note, timestamp;
    `;

    const result = await client.query(query, [
      action,
      sourceShiftId,
      targetShiftId,
      swappedWith,
      originalOwner,
      note,
    ]);

    return result.rows[0];
  },

  /**
   * Find all swap logs for an array of shift IDs
   */
  async findByShiftIds(shiftIds, client = pool) {
    if (!shiftIds || shiftIds.length === 0) {
      return [];
    }

    const query = `
      SELECT id, action, source_shift_id, target_shift_id,
             swapped_with, original_owner, note, timestamp
      FROM shift_swap_logs
      WHERE source_shift_id = ANY($1::uuid[]) OR target_shift_id = ANY($1::uuid[])
      ORDER BY timestamp ASC;
    `;

    const result = await client.query(query, [shiftIds]);
    return result.rows;
  },
};
