import { customerService } from '../services/customerService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * POST /customers
 * Create a new customer
 */
export const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, customer, 'สร้างข้อมูลลูกค้าสำเร็จ', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * GET /customers
 * Get or search customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getCustomers(req.query);
    return sendSuccess(res, customers, 'ดึงรายชื่อลูกค้าสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * GET /customers/:id
 * Get customer detail, service history, and appointments
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const customerDetail = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, customerDetail, 'ดึงรายละเอียดลูกค้าสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * PUT /customers/:id
 * Update customer details
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const updatedCustomer = await customerService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, updatedCustomer, 'แก้ไขข้อมูลลูกค้าสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * DELETE /customers/:id
 * Delete a customer
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const deleted = await customerService.deleteCustomer(req.params.id);
    return sendSuccess(res, deleted, 'ลบข้อมูลลูกค้าสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};

/**
 * POST /customers/:id/appointments
 * Create advance appointment for customer (legacy compatibility)
 */
export const createCustomerAppointment = async (req, res, next) => {
  try {
    const appointment = await customerService.createAppointment(req.params.id, req.body);
    return sendSuccess(res, appointment, 'สร้างนัดหมายสำเร็จ', 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};
