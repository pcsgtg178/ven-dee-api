import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/db.js';
import { swapShift, cancelSwap, getShiftChain } from '../src/controllers/shiftController.js';
import { getEvents } from '../src/controllers/eventController.js';

// Helper to create mock Express req, res, next
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
    if (err) {
      throw err;
    }
  };

  return { req, res, next };
};

describe('Shift Swap Engine & Multi-hop Swap Tests', () => {
  let shiftsDb = [];
  let logsDb = [];

  // Intercept pool.connect and pool.query to simulate PostgreSQL database in-memory
  beforeEach(() => {
    shiftsDb = [];
    logsDb = [];

    const mockClient = {
      query: async (sql, params = []) => {
        const trimmedSql = sql.trim().toUpperCase();

        if (trimmedSql.startsWith('BEGIN') || trimmedSql.startsWith('COMMIT') || trimmedSql.startsWith('ROLLBACK')) {
          return { rows: [] };
        }

        // SELECT * FROM shift_todos WHERE id = $1
        if (trimmedSql.startsWith('SELECT') && sql.includes('shift_todos') && sql.includes('WHERE id = $1')) {
          const shift = shiftsDb.find((s) => s.id === params[0]);
          return { rows: shift ? [{ ...shift }] : [] };
        }

        // UPDATE shift_todos SET status
        if (sql.includes('UPDATE shift_todos') && sql.includes('status')) {
          const targetId = params[0];
          let newStatus = params[1];
          if (!newStatus) {
            if (sql.includes("'swapped_out'")) newStatus = 'swapped_out';
            else if (sql.includes("'cancelled'")) newStatus = 'cancelled';
            else if (sql.includes("'active'")) newStatus = 'active';
          }
          const shift = shiftsDb.find((s) => s.id === targetId);
          if (shift) {
            shift.status = newStatus;
            shift.updated_at = new Date();
            return { rows: [{ ...shift }] };
          }
          return { rows: [] };
        }

        // INSERT INTO shift_todos
        if (sql.includes('INSERT INTO shift_todos')) {
          let type = 'shift', shift, date, category = 'black', status = 'active', is_locked = false;
          let parent_shift_id = null, swapped_with = null, original_owner = null, swap_note = null;
          if (params.length === 10) {
            [type, shift, date, category, status, is_locked, parent_shift_id, swapped_with, original_owner, swap_note] = params;
          } else {
            [shift, date, category, parent_shift_id, swapped_with, original_owner, swap_note] = params;
          }
          const newShift = {
            id: uuidv4(),
            type,
            shift,
            date,
            category,
            status,
            is_locked,
            parent_shift_id,
            swapped_with,
            original_owner,
            swap_note,
            created_at: new Date(),
            updated_at: new Date(),
          };
          shiftsDb.push(newShift);
          return { rows: [{ ...newShift }] };
        }

        // COUNT active black shifts in month
        if (sql.includes("category = 'black'") && sql.includes("status = 'active'")) {
          const start = params[0];
          const end = params[1];
          const count = shiftsDb.filter(
            (s) => s.category === 'black' && s.status === 'active' && s.date >= start && s.date <= end
          ).length;
          return { rows: [{ count }] };
        }

        // INSERT INTO shift_swap_logs
        if (sql.includes('INSERT INTO shift_swap_logs')) {
          let action, source_shift_id, target_shift_id, swapped_with, original_owner, note;
          if (params.length === 6) {
            [action, source_shift_id, target_shift_id, swapped_with, original_owner, note] = params;
          } else {
            action = sql.includes("'cancel_swap'") ? 'cancel_swap' : 'swap';
            [source_shift_id, target_shift_id, swapped_with, original_owner, note] = params;
          }
          const log = {
            id: uuidv4(),
            action,
            source_shift_id,
            target_shift_id,
            swapped_with,
            original_owner,
            note,
            timestamp: new Date(),
          };
          logsDb.push(log);
          return { rows: [{ ...log }] };
        }

        // SELECT * FROM shift_swap_logs WHERE source_shift_id = ANY($1::uuid[]) ...
        if (sql.includes('FROM shift_swap_logs')) {
          const ids = params[0] || [];
          const matchedLogs = logsDb.filter(
            (l) => ids.includes(l.source_shift_id) || ids.includes(l.target_shift_id)
          );
          return { rows: matchedLogs };
        }

        // SELECT FROM shift_todos for events
        if (sql.includes('SELECT id, type, shift, date, category, status')) {
          let rows = [...shiftsDb];
          if (!sql.includes("status = 'active'")) {
            // includeSwapped is true, return all
          } else {
            rows = rows.filter((s) => s.status === 'active');
          }
          return { rows };
        }

        // Service todos query
        if (sql.includes('FROM service_todos')) {
          return { rows: [] };
        }

        return { rows: [] };
      },
      release: () => {},
    };

    pool.connect = async () => mockClient;
    pool.query = mockClient.query;
  });

  it('Scenario 1: Swap active shift -> changes source to swapped_out, creates new active shift with parentShiftId & logs to ShiftSwapLog', async () => {
    // Initial root shift
    const initialShiftId = uuidv4();
    shiftsDb.push({
      id: initialShiftId,
      shift: 'morning',
      date: '2026-10-10', // future date
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: null,
      swapped_with: null,
      original_owner: 'Nurse Somchai',
      swap_note: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: initialShiftId },
      body: {
        date: '2026-10-12',
        shift: 'night',
        category: 'black',
        swappedWith: 'Nurse Somsri',
        swapNote: 'Swap to attend training',
      },
    });

    await swapShift(req, res, next);

    assert.equal(res.getStatus(), 201);
    const body = res.getBody();
    assert.equal(body.status, 201);
    assert.equal(body.data.sourceShift.status, 'swapped_out');
    assert.equal(body.data.newShift.status, 'active');
    assert.equal(body.data.newShift.extendedProps.parentShiftId, initialShiftId);
    assert.equal(body.data.newShift.extendedProps.swappedWith, 'Nurse Somsri');
    assert.equal(body.data.newShift.extendedProps.originalOwner, 'Nurse Somchai'); // Inherited from source

    // Verify ShiftSwapLog
    assert.equal(logsDb.length, 1);
    assert.equal(logsDb[0].action, 'swap');
    assert.equal(logsDb[0].source_shift_id, initialShiftId);
    assert.equal(logsDb[0].target_shift_id, body.data.newShift.id);
  });

  it('Scenario 2: Black shift quota warning -> triggers blackShiftWarning: true and calculates missing days when < 14', async () => {
    const shiftId = uuidv4();
    // Only 1 black shift in October 2026
    shiftsDb.push({
      id: shiftId,
      shift: 'afternoon',
      date: '2026-10-05',
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: null,
      swapped_with: null,
      original_owner: 'Nurse Somchai',
      swap_note: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: shiftId },
      body: {
        date: '2026-10-15',
        shift: 'night',
        category: 'red', // Swapping for a RED shift (OT), leaving 0 black shifts!
        swappedWith: 'Nurse Bob',
      },
    });

    await swapShift(req, res, next);

    assert.equal(res.getStatus(), 201);
    const body = res.getBody();
    assert.equal(body.data.blackShiftWarning, true);
    assert.equal(body.data.blackShiftCount, 0);
    assert.equal(body.data.missingBlackShifts, 14); // Missing all 14 black shifts
  });

  it('Scenario 3: Reject swap on locked or already swapped shift', async () => {
    const shiftId = uuidv4();
    shiftsDb.push({
      id: shiftId,
      shift: 'morning',
      date: '2026-10-01',
      category: 'black',
      status: 'swapped_out', // already swapped
      is_locked: false,
      parent_shift_id: null,
      swapped_with: null,
      original_owner: 'Nurse Somchai',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: shiftId },
      body: {
        date: '2026-10-02',
        shift: 'night',
        category: 'black',
        swappedWith: 'Nurse Bob',
      },
    });

    await swapShift(req, res, next);

    assert.equal(res.getStatus(), 400);
    assert.ok(res.getBody().message.includes('must be \'active\''));
  });

  it('Scenario 4: Multi-hop Swap Chain -> GET /api/shifts/:id/chain traces Node 1 (Root) -> Node 2 -> Node 3', async () => {
    const node1Id = uuidv4();
    const node2Id = uuidv4();
    const node3Id = uuidv4();

    // Node 1: Root shift owned by Somchai
    shiftsDb.push({
      id: node1Id,
      shift: 'morning',
      date: '2026-11-01',
      category: 'black',
      status: 'swapped_out',
      is_locked: false,
      parent_shift_id: null,
      swapped_with: null,
      original_owner: 'Nurse Somchai',
      created_at: new Date('2026-10-01T08:00:00Z'),
      updated_at: new Date('2026-10-01T09:00:00Z'),
    });

    // Node 2: Swapped with Somsri
    shiftsDb.push({
      id: node2Id,
      shift: 'afternoon',
      date: '2026-11-02',
      category: 'black',
      status: 'swapped_out',
      is_locked: false,
      parent_shift_id: node1Id,
      swapped_with: 'Nurse Somsri',
      original_owner: 'Nurse Somchai',
      created_at: new Date('2026-10-01T09:00:00Z'),
      updated_at: new Date('2026-10-02T10:00:00Z'),
    });
    logsDb.push({
      id: uuidv4(),
      action: 'swap',
      source_shift_id: node1Id,
      target_shift_id: node2Id,
      swapped_with: 'Nurse Somsri',
      original_owner: 'Nurse Somchai',
      note: 'Swap Hop 1',
      timestamp: new Date('2026-10-01T09:00:00Z'),
    });

    // Node 3: Swapped with Charlie
    shiftsDb.push({
      id: node3Id,
      shift: 'night',
      date: '2026-11-03',
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: node2Id,
      swapped_with: 'Nurse Charlie',
      original_owner: 'Nurse Somchai',
      created_at: new Date('2026-10-02T10:00:00Z'),
      updated_at: new Date('2026-10-02T10:00:00Z'),
    });
    logsDb.push({
      id: uuidv4(),
      action: 'swap',
      source_shift_id: node2Id,
      target_shift_id: node3Id,
      swapped_with: 'Nurse Charlie',
      original_owner: 'Nurse Somchai',
      note: 'Swap Hop 2',
      timestamp: new Date('2026-10-02T10:00:00Z'),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: node3Id },
    });

    await getShiftChain(req, res, next);

    assert.equal(res.getStatus(), 200);
    const body = res.getBody();
    assert.equal(body.data.rootShiftId, node1Id);
    assert.equal(body.data.currentShiftId, node3Id);
    assert.equal(body.data.totalHops, 2);
    assert.equal(body.data.chainLength, 3);

    // Audit trail order: Node 1 (Root) -> Node 2 -> Node 3
    assert.equal(body.data.auditTrail[0].shift.id, node1Id);
    assert.equal(body.data.auditTrail[0].isRootNode, true);
    assert.equal(body.data.auditTrail[1].shift.id, node2Id);
    assert.equal(body.data.auditTrail[2].shift.id, node3Id);
    assert.equal(body.data.auditTrail[2].isTargetNode, true);
  });

  it('Scenario 5: Cancel swap -> sets current to cancelled, restores parent to active, records log', async () => {
    const parentId = uuidv4();
    const currentId = uuidv4();

    shiftsDb.push({
      id: parentId,
      shift: 'morning',
      date: '2026-12-01',
      category: 'black',
      status: 'swapped_out',
      is_locked: false,
      parent_shift_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    shiftsDb.push({
      id: currentId,
      shift: 'night',
      date: '2026-12-02',
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: parentId,
      swapped_with: 'Nurse Bob',
      original_owner: 'Nurse Alice',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: currentId },
      body: { note: 'Change of plans' },
    });

    await cancelSwap(req, res, next);

    assert.equal(res.getStatus(), 200);
    const body = res.getBody();
    assert.equal(body.data.cancelledShift.status, 'cancelled');
    assert.equal(body.data.restoredShift.status, 'active');

    // Check log
    const cancelLog = logsDb.find((l) => l.action === 'cancel_swap');
    assert.ok(cancelLog);
    assert.equal(cancelLog.source_shift_id, parentId);
    assert.equal(cancelLog.target_shift_id, currentId);
  });

  it('Scenario 6: Cancel swap on past shift -> rejects with 400 and "Shift is locked and cannot be undone"', async () => {
    const parentId = uuidv4();
    const currentId = uuidv4();

    shiftsDb.push({
      id: parentId,
      shift: 'morning',
      date: '2020-01-01', // Past date!
      category: 'black',
      status: 'swapped_out',
      is_locked: false,
      parent_shift_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    shiftsDb.push({
      id: currentId,
      shift: 'night',
      date: '2020-01-02', // Past date!
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: parentId,
      swapped_with: 'Nurse Bob',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { req, res, next } = createMockReqRes({
      params: { id: currentId },
    });

    await cancelSwap(req, res, next);

    assert.equal(res.getStatus(), 400);
    assert.equal(res.getBody().message, 'Shift is locked and cannot be undone');
  });

  it('Scenario 7: GET /api/events -> filters active shifts by default, returns swapped when includeSwapped=true, calculates isLocked', async () => {
    const activeFutureId = uuidv4();
    const swappedOutId = uuidv4();
    const pastActiveId = uuidv4();

    shiftsDb.push({
      id: activeFutureId,
      shift: 'morning',
      date: '2029-05-10',
      category: 'black',
      status: 'active',
      is_locked: false,
      created_at: new Date(),
    });
    shiftsDb.push({
      id: swappedOutId,
      shift: 'night',
      date: '2029-05-11',
      category: 'red',
      status: 'swapped_out',
      is_locked: false,
      created_at: new Date(),
    });
    shiftsDb.push({
      id: pastActiveId,
      shift: 'afternoon',
      date: '2020-01-10', // Past date!
      category: 'black',
      status: 'active',
      is_locked: false,
      created_at: new Date(),
    });

    // 1. Default call (no includeSwapped)
    const { req: req1, res: res1, next: next1 } = createMockReqRes({ query: {} });
    await getEvents(req1, res1, next1);
    assert.equal(res1.getStatus(), 200);
    const events1 = res1.getBody().data;
    // Should only contain active shifts (activeFutureId and pastActiveId)
    assert.equal(events1.length, 2);
    const pastEvent = events1.find((e) => e.id === pastActiveId);
    assert.equal(pastEvent.isLocked, true); // Evaluated automatically because 2020 is past!

    // 2. With includeSwapped=true
    const { req: req2, res: res2, next: next2 } = createMockReqRes({ query: { includeSwapped: 'true' } });
    await getEvents(req2, res2, next2);
    assert.equal(res2.getStatus(), 200);
    const events2 = res2.getBody().data;
    assert.equal(events2.length, 3);
  });
});
