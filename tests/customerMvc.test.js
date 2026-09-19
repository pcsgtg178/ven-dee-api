import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../src/config/db.js';
import { customerService } from '../src/services/customerService.js';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  createCustomerAppointment,
} from '../src/controllers/customerController.js';

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

describe('Customer MVC Architecture Tests', () => {
  let customersDb = [];
  let serviceTodosDb = [];
  let appointmentsDb = [];

  beforeEach(() => {
    customersDb = [];
    serviceTodosDb = [];
    appointmentsDb = [];

    const mockClient = {
      query: async (sql, params = []) => {
        const trimmedSql = sql.trim().toUpperCase();

        // INSERT INTO customers
        if (sql.includes('INSERT INTO customers')) {
          const customer = {
            id: uuidv4(),
            name: params[0],
            phone: params[1],
            note: params[2],
            createdAt: new Date(),
          };
          customersDb.push(customer);
          return { rows: [{ ...customer }] };
        }

        // SELECT FROM customers WHERE 1=1
        if (sql.includes('FROM customers WHERE 1=1')) {
          let rows = [...customersDb];
          if (params.length > 0) {
            const search = params[0].replace(/%/g, '').toLowerCase();
            rows = rows.filter(
              (c) =>
                c.name.toLowerCase().includes(search) ||
                (c.phone && c.phone.toLowerCase().includes(search)) ||
                (c.note && c.note.toLowerCase().includes(search))
            );
          }
          return { rows };
        }

        // SELECT FROM customers WHERE id = $1
        if (trimmedSql.startsWith('SELECT') && sql.includes('customers') && sql.includes('WHERE id = $1')) {
          const customer = customersDb.find((c) => c.id === params[0]);
          return { rows: customer ? [{ ...customer }] : [] };
        }

        // UPDATE customers
        if (sql.includes('UPDATE customers')) {
          const customer = customersDb.find((c) => c.id === params[0]);
          if (customer) {
            // updates
            if (params.length > 1) {
              customer.name = params[1] !== undefined ? params[1] : customer.name;
            }
            return { rows: [{ ...customer }] };
          }
          return { rows: [] };
        }

        // DELETE FROM customers
        if (sql.includes('DELETE FROM customers WHERE id = $1')) {
          const idx = customersDb.findIndex((c) => c.id === params[0]);
          if (idx !== -1) {
            const deleted = customersDb.splice(idx, 1)[0];
            return { rows: [{ id: deleted.id }] };
          }
          return { rows: [] };
        }

        // SELECT FROM service_todos WHERE customer_id = $1
        if (sql.includes('service_todos') && sql.includes('customer_id = $1')) {
          const rows = serviceTodosDb.filter((s) => s.customerId === params[0]);
          return { rows };
        }

        // SELECT FROM appointments WHERE customer_id = $1
        if (sql.includes('appointments') && sql.includes('customer_id = $1')) {
          const rows = appointmentsDb.filter((a) => a.customerId === params[0]);
          return { rows };
        }

        // INSERT INTO appointments
        if (sql.includes('INSERT INTO appointments')) {
          const appt = {
            id: uuidv4(),
            customerId: params[0],
            appointmentDate: params[1],
            services: params[2],
            medicines: params[3],
            note: params[4],
            status: params[5] || 'pending',
            createdAt: new Date(),
          };
          appointmentsDb.push(appt);
          return { rows: [{ ...appt }] };
        }

        return { rows: [] };
      },
    };

    pool.query = mockClient.query;
  });

  it('Customer Flow: Create -> List -> GetById (with services and appointments) -> Update -> Delete', async () => {
    // 1. Create Customer via Controller
    const { req: req1, res: res1, next: next1 } = createMockReqRes({
      body: { name: 'Khun Somchai', phone: '0812345678', note: 'VIP Patient' },
    });
    await createCustomer(req1, res1, next1);
    assert.equal(res1.getStatus(), 201);
    const created = res1.getBody().data;
    assert.ok(created.id);
    assert.equal(created.name, 'Khun Somchai');

    // 2. Add an appointment for customer via Controller
    const { req: reqAppt, res: resAppt, next: nextAppt } = createMockReqRes({
      params: { id: created.id },
      body: {
        appointmentDate: '2026-10-20T10:00:00Z',
        services: ['injection'],
        medicines: ['Vitamin C'],
        note: 'Follow-up',
      },
    });
    await createCustomerAppointment(reqAppt, resAppt, nextAppt);
    assert.equal(resAppt.getStatus(), 201);

    // 3. Get Customers List via Controller
    const { req: req2, res: res2, next: next2 } = createMockReqRes({
      query: { search: 'Somchai' },
    });
    await getCustomers(req2, res2, next2);
    assert.equal(res2.getStatus(), 200);
    assert.equal(res2.getBody().data.length, 1);

    // 4. Get Customer Details (aggregating appointments)
    const { req: req3, res: res3, next: next3 } = createMockReqRes({
      params: { id: created.id },
    });
    await getCustomerById(req3, res3, next3);
    assert.equal(res3.getStatus(), 200);
    const detail = res3.getBody().data;
    assert.equal(detail.name, 'Khun Somchai');
    assert.equal(detail.appointments.length, 1);

    // 5. Update Customer
    const { req: req4, res: res4, next: next4 } = createMockReqRes({
      params: { id: created.id },
      body: { name: 'Khun Somchai Updated' },
    });
    await updateCustomer(req4, res4, next4);
    assert.equal(res4.getStatus(), 200);

    // 6. Delete Customer
    const { req: req5, res: res5, next: next5 } = createMockReqRes({
      params: { id: created.id },
    });
    await deleteCustomer(req5, res5, next5);
    assert.equal(res5.getStatus(), 200);
    assert.equal(customersDb.length, 0);
  });
});
