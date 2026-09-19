import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/db.js';
import {
  createShift,
  getShifts,
  updateShift,
  deleteShift,
  restoreShift,
  simulateQuotaImpact,
} from '../src/controllers/shiftController.js';

const createMockReqRes = (reqData = {}) => {
  const req = {
    params: reqData.params || {},
    body: reqData.body || {},
    query: reqData.query || {},
  };

  let statusCode = 200;
  let responseBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
    getStatus: () => statusCode,
    getBody: () => responseBody,
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, next };
};

describe('Shift Lifecycle & Operations Tests', () => {
  let shiftsDb = [];

  beforeEach(() => {
    shiftsDb = [];

    const mockClient = {
      query: async (sql, params = []) => {
        const trimmedSql = sql.trim().toUpperCase();

        if (trimmedSql.startsWith('BEGIN') || trimmedSql.startsWith('COMMIT') || trimmedSql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }

        // Check duplicate: SELECT id, shift, date, status FROM shift_todos WHERE date = $1 AND shift = $2 AND status = 'active'
        if (sql.includes('date = $1 AND shift = $2 AND status = \'active\'')) {
          const found = shiftsDb.find(
            (s) => s.date === params[0] && s.shift === params[1] && s.status === 'active'
          );
          return { rows: found ? [{ ...found }] : [] };
        }

        // Conflict check with services: SELECT cs.id ...
        if (sql.includes('customer_services') || sql.includes('service_todos')) {
          return { rows: [] };
        }

        // Count active black shifts
        if (sql.includes('COUNT(*)::int AS count') && sql.includes('category = \'black\'')) {
          const count = shiftsDb.filter((s) => s.category === 'black' && s.status === 'active').length;
          return { rows: [{ count }] };
        }

        // SELECT id ... FROM shift_todos WHERE id = $1
        if (trimmedSql.startsWith('SELECT') && sql.includes('shift_todos') && sql.includes('WHERE id = $1')) {
          const shift = shiftsDb.find((s) => s.id === params[0]);
          return { rows: shift ? [{ ...shift }] : [] };
        }

        // SELECT id ... FROM shift_todos WHERE 1=1 (getShifts)
        if (sql.includes('FROM shift_todos WHERE 1=1')) {
          return { rows: [...shiftsDb] };
        }

        // INSERT INTO shift_todos
        if (sql.includes('INSERT INTO shift_todos')) {
          const newShift = {
            id: uuidv4(),
            type: params[0] || 'shift',
            shift: params[1],
            date: params[2],
            category: params[3] || 'black',
            status: params[4] || 'active',
            is_locked: params[5] || false,
            parent_shift_id: params[6] || null,
            swapped_with: params[7] || null,
            original_owner: params[8] || null,
            swap_note: params[9] || null,
            department: null,
            note: params[9] || null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          shiftsDb.push(newShift);
          return { rows: [{ ...newShift }] };
        }

        // UPDATE shift_todos SET status
        if (sql.includes('UPDATE shift_todos') && sql.includes('status = $2')) {
          const shift = shiftsDb.find((s) => s.id === params[0]);
          if (shift) {
            shift.status = params[1];
            return { rows: [{ ...shift }] };
          }
          return { rows: [] };
        }

        // UPDATE shift_todos SET department / note
        if (sql.includes('UPDATE shift_todos') && (sql.includes('department') || sql.includes('note'))) {
          const shift = shiftsDb.find((s) => s.id === params[0]);
          if (shift) {
            shift.department = params[1] !== undefined ? params[1] : shift.department;
            shift.note = params[2] !== undefined ? params[2] : shift.note;
            return { rows: [{ ...shift }] };
          }
          return { rows: [] };
        }

        // DELETE FROM shift_todos
        if (sql.includes('DELETE FROM shift_todos WHERE id = $1')) {
          const idx = shiftsDb.findIndex((s) => s.id === params[0]);
          if (idx !== -1) {
            const deleted = shiftsDb.splice(idx, 1)[0];
            return { rows: [{ id: deleted.id, parent_shift_id: deleted.parent_shift_id }] };
          }
          return { rows: [] };
        }

        return { rows: [] };
      },
      release: () => {},
    };

    pool.connect = async () => mockClient;
    pool.query = mockClient.query;
  });

  it('createShift succeeds and detects DUPLICATE_SHIFT when same shiftType exists on date', async () => {
    // 1. Create morning shift
    const { req: req1, res: res1, next: next1 } = createMockReqRes({
      body: {
        date: '2026-09-22',
        shiftType: 'morning',
        category: 'black',
        department: 'วอร์ด ICU ผู้ใหญ่',
        note: 'เวรเช้าปกติ',
      },
    });

    await createShift(req1, res1, next1);
    assert.equal(res1.getStatus(), 201);
    const body1 = res1.getBody();
    assert.equal(body1.success, true);
    assert.equal(body1.data.shiftType, 'morning');
    assert.equal(body1.data.date, '2026-09-22');

    // 2. Attempt to create duplicate morning shift on same date
    const { req: req2, res: res2, next: next2 } = createMockReqRes({
      body: {
        date: '2026-09-22',
        shiftType: 'morning',
        category: 'black',
      },
    });

    await createShift(req2, res2, next2);
    assert.equal(res2.getStatus(), 409);
    const body2 = res2.getBody();
    assert.equal(body2.success, false);
    assert.equal(body2.error.code, 'DUPLICATE_SHIFT');
  });

  it('updateShift updates shift fields and rejects if shift is locked', async () => {
    // Seed an unlocked future shift
    const shiftId = uuidv4();
    shiftsDb.push({
      id: shiftId,
      shift: 'afternoon',
      date: '2026-10-15',
      category: 'black',
      status: 'active',
      is_locked: false,
      department: 'ICU',
      note: 'Old note',
    });

    // Update
    const { req: req1, res: res1, next: next1 } = createMockReqRes({
      params: { id: shiftId },
      body: { department: 'ER', note: 'New note' },
    });
    await updateShift(req1, res1, next1);
    assert.equal(res1.getStatus(), 200);

    // Seed a locked past shift
    const lockedId = uuidv4();
    shiftsDb.push({
      id: lockedId,
      shift: 'night',
      date: '2026-01-01',
      category: 'black',
      status: 'active',
      is_locked: true,
    });

    const { req: req2, res: res2, next: next2 } = createMockReqRes({
      params: { id: lockedId },
      body: { note: 'Try to edit past shift' },
    });
    await updateShift(req2, res2, next2);
    assert.equal(res2.getStatus(), 400);
    assert.equal(res2.getBody().error.code, 'SHIFT_IS_LOCKED');
  });

  it('deleteShift auto-restores parent shift if deleted shift came from a swap', async () => {
    const parentId = uuidv4();
    const childId = uuidv4();

    // Parent shift is swapped_out
    shiftsDb.push({
      id: parentId,
      shift: 'morning',
      date: '2026-10-20',
      category: 'black',
      status: 'swapped_out',
      is_locked: false,
    });

    // Child shift was received from swap
    shiftsDb.push({
      id: childId,
      shift: 'afternoon',
      date: '2026-10-22',
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: parentId,
    });

    const { req, res, next } = createMockReqRes({
      params: { id: childId },
    });

    await deleteShift(req, res, next);
    assert.equal(res.getStatus(), 200);
    const body = res.getBody();
    assert.equal(body.success, true);
    assert.equal(body.data.deletedShiftId, childId);
    assert.equal(body.data.restoredParentId, parentId);

    // Verify parent shift is restored to active
    const restoredParent = shiftsDb.find((s) => s.id === parentId);
    assert.equal(restoredParent.status, 'active');
  });

  it('simulateQuotaImpact calculates warning when swapping black shift reduces count below 14', async () => {
    // 13 active black shifts in September 2026
    for (let i = 1; i <= 13; i++) {
      shiftsDb.push({
        id: uuidv4(),
        shift: 'morning',
        date: `2026-09-${String(i).padStart(2, '0')}`,
        category: 'black',
        status: 'active',
      });
    }

    const { req, res, next } = createMockReqRes({
      body: {
        newCategory: 'red',
        targetDate: '2026-09-24',
      },
    });

    await simulateQuotaImpact(req, res, next);
    assert.equal(res.getStatus(), 200);
    const data = res.getBody().data;
    assert.equal(data.currentBlackCount, 13);
    assert.equal(data.simulatedBlackCount, 12);
    assert.equal(data.quota, 14);
    assert.equal(data.remainingNeeded, 2);
    assert.equal(data.willBeUnderQuota, true);
    assert.ok(data.warningMessage.includes('เหลือเพียง 12/14 วัน'));
  });
});
