import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/db.js';
import {
  createService,
  updateServiceStatus,
  deleteService,
} from '../src/controllers/serviceController.js';
import { getMonthlyQuota } from '../src/controllers/analyticsController.js';
import { getActivities } from '../src/controllers/scheduleController.js';

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

describe('Customer Services, Analytics & Feed Tests', () => {
  let customerServicesDb = [];
  let shiftsDb = [];
  let customersDb = [];

  beforeEach(() => {
    customerServicesDb = [];
    shiftsDb = [];
    customersDb = [];

    const mockClient = {
      query: async (sql, params = []) => {
        // 1. Conflict check query with UNION
        if (sql.includes('UNION') && (sql.includes('shifts') || sql.includes('shift_todos'))) {
          const date = params[0];
          const shifts = shiftsDb.filter((s) => s.date === date && s.status === 'active');
          return { rows: shifts };
        }

        // 2. INSERT INTO customers
        if (sql.includes('INSERT INTO customers')) {
          const c = { id: uuidv4(), name: params[0] };
          customersDb.push(c);
          return { rows: [c] };
        }

        // 3. INSERT INTO customer_services
        if (sql.includes('INSERT INTO customer_services')) {
          const newSrv = {
            id: uuidv4(),
            customerId: params[0],
            date: params[1],
            time: params[2],
            services: JSON.parse(params[3] || '[]'),
            otherServiceText: params[4],
            medications: JSON.parse(params[5] || '[]'),
            note: params[6],
            status: params[7] || 'upcoming',
            price: params[8] || 0.0,
            createdAt: new Date(),
          };
          customerServicesDb.push(newSrv);
          return { rows: [{ ...newSrv }] };
        }

        // 4. SELECT FROM customer_services WHERE id = $1
        if (sql.includes('FROM customer_services cs') && sql.includes('WHERE cs.id = $1')) {
          const srv = customerServicesDb.find((s) => s.id === params[0]);
          return { rows: srv ? [{ ...srv, customerName: 'คุณยายสมศรี' }] : [] };
        }

        // 5. UPDATE customer_services status
        if (sql.includes('UPDATE customer_services') && sql.includes('status = $2')) {
          const srv = customerServicesDb.find((s) => s.id === params[0]);
          if (srv) {
            srv.status = params[1];
            return { rows: [{ ...srv }] };
          }
          return { rows: [] };
        }

        // 6. DELETE FROM customer_services
        if (sql.includes('DELETE FROM customer_services WHERE id = $1')) {
          const idx = customerServicesDb.findIndex((s) => s.id === params[0]);
          if (idx !== -1) {
            customerServicesDb.splice(idx, 1);
            return { rows: [{ id: params[0] }] };
          }
          return { rows: [] };
        }

        // 7. Analytics monthly quota
        if (sql.includes('blackCount') && sql.includes('redCount')) {
          const blackCount = shiftsDb.filter((s) => s.category === 'black' && s.status === 'active').length;
          const redCount = shiftsDb.filter((s) => s.category === 'red' && s.status === 'active').length;
          return { rows: [{ blackCount, redCount }] };
        }

        // 8. Schedule activities: shifts
        if (sql.includes('shift_todos') && sql.includes('1=1')) {
          return { rows: [...shiftsDb] };
        }

        // 9. Schedule activities: customer_services
        if (sql.includes('customer_services') && sql.includes('1=1')) {
          return { rows: [...customerServicesDb] };
        }

        // 10. Customer findById
        if (sql.includes('FROM customers') && sql.includes('WHERE id = $1')) {
          return { rows: [{ id: params[0], name: 'คุณยายสมศรี' }] };
        }

        return { rows: [] };
      },
      release: () => {},
    };

    pool.connect = async () => mockClient;
    pool.query = mockClient.query;
  });

  it('createService succeeds when no shift conflict and rejects with 409 CONFLICT_WITH_SHIFT during shift hours', async () => {
    // 1. Shift morning on 2026-09-20 (08:00 - 16:00)
    shiftsDb.push({
      id: uuidv4(),
      shift: 'morning',
      date: '2026-09-20',
      category: 'black',
      status: 'active',
    });

    // Attempt service appointment at 14:00 (during morning shift)
    const { req: reqConflict, res: resConflict, next: nextConflict } = createMockReqRes({
      body: {
        date: '2026-09-20',
        time: '14:00',
        services: ['injection'],
        medications: ['Insulin 10U'],
        customerName: 'คุณยายสมศรี',
      },
    });

    await createService(reqConflict, resConflict, nextConflict);
    assert.equal(resConflict.getStatus(), 409);
    const conflictBody = resConflict.getBody();
    assert.equal(conflictBody.success, false);
    assert.equal(conflictBody.error.code, 'CONFLICT_WITH_SHIFT');
    assert.ok(conflictBody.error.message.includes('เวรเช้า'));

    // Service appointment at 17:00 (after morning shift ends)
    const { req: reqOk, res: resOk, next: nextOk } = createMockReqRes({
      body: {
        date: '2026-09-20',
        time: '17:00',
        services: ['injection'],
        medications: ['Insulin 10U'],
        customerName: 'คุณยายสมศรี',
      },
    });

    await createService(reqOk, resOk, nextOk);
    assert.equal(resOk.getStatus(), 201);
    const okBody = resOk.getBody();
    assert.equal(okBody.success, true);
    assert.equal(okBody.data.time, '17:00');
    assert.equal(okBody.data.status, 'upcoming');
  });

  it('createService allows booking at any time when day has R1 Refer shift', async () => {
    // R1 shift on 2026-09-25
    shiftsDb.push({
      id: uuidv4(),
      shift: 'r1',
      date: '2026-09-25',
      category: 'green',
      status: 'active',
    });

    const { req, res, next } = createMockReqRes({
      body: {
        date: '2026-09-25',
        time: '14:00',
        services: ['drip'],
        medications: [],
        customerName: 'คุณแพรวพรรณ',
      },
    });

    await createService(req, res, next);
    assert.equal(res.getStatus(), 201);
    assert.equal(res.getBody().success, true);
  });

  it('updateServiceStatus updates status to completed and deleteService deletes the appointment', async () => {
    const srvId = uuidv4();
    customerServicesDb.push({
      id: srvId,
      customerId: uuidv4(),
      date: '2026-09-21',
      time: '10:00',
      services: ['drip'],
      status: 'upcoming',
    });

    // Update status
    const { req: reqUpdate, res: resUpdate, next: nextUpdate } = createMockReqRes({
      params: { id: srvId },
      body: { status: 'completed' },
    });
    await updateServiceStatus(reqUpdate, resUpdate, nextUpdate);
    assert.equal(resUpdate.getStatus(), 200);
    assert.equal(resUpdate.getBody().data.status, 'completed');

    // Delete
    const { req: reqDelete, res: resDelete, next: nextDelete } = createMockReqRes({
      params: { id: srvId },
    });
    await deleteService(reqDelete, resDelete, nextDelete);
    assert.equal(resDelete.getStatus(), 200);
    assert.equal(resDelete.getBody().data.deletedServiceId, srvId);
    assert.equal(customerServicesDb.length, 0);
  });

  it('getMonthlyQuota and getActivities return standard analytics and unified schedule feed', async () => {
    // 14 black shifts, 2 red shifts
    for (let i = 1; i <= 14; i++) {
      shiftsDb.push({
        id: uuidv4(),
        shift: 'morning',
        date: `2026-09-${String(i).padStart(2, '0')}`,
        category: 'black',
        status: 'active',
      });
    }
    for (let i = 15; i <= 16; i++) {
      shiftsDb.push({
        id: uuidv4(),
        shift: 'afternoon',
        date: `2026-09-${String(i).padStart(2, '0')}`,
        category: 'red',
        status: 'active',
      });
    }

    // 1. Get Monthly Quota
    const { req: reqQuota, res: resQuota, next: nextQuota } = createMockReqRes({
      query: { month: '2026-09' },
    });
    await getMonthlyQuota(reqQuota, resQuota, nextQuota);
    assert.equal(resQuota.getStatus(), 200);
    const quotaData = resQuota.getBody().data;
    assert.equal(quotaData.blackCount, 14);
    assert.equal(quotaData.redCount, 2);
    assert.equal(quotaData.quota, 14);
    assert.equal(quotaData.isMet, true);
    assert.equal(quotaData.remaining, 0);
    assert.equal(quotaData.percentage, 100);

    // 2. Get Unified Schedule Feed
    const { req: reqFeed, res: resFeed, next: nextFeed } = createMockReqRes({
      query: { month: '2026-09', type: 'all' },
    });
    await getActivities(reqFeed, resFeed, nextFeed);
    assert.equal(resFeed.getStatus(), 200);
    const feed = resFeed.getBody().data;
    assert.equal(feed.length, 16);
    assert.equal(feed[0].type, 'shift');
    assert.equal(feed[0].date, '2026-09-01');
  });
});
