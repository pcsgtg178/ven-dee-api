import { customerServiceModel } from '../models/customerServiceModel.js';
import { customerModel } from '../models/customerModel.js';
import { conflictService } from './conflictService.js';
import { AppError } from '../utils/responseHandler.js';
import { pool } from '../config/db.js';

export const serviceService = {
  /**
   * Create a new customer service appointment with conflict check against hospital shifts
   */
  async createService(data) {
    const {
      customerId: inputCustomerId,
      customerName,
      customerPhone,
      customerNote,
      date,
      time,
      services,
      otherServiceText = null,
      medications = [],
      note = '',
      price = 0,
    } = data;

    // 1. Conflict Check: Verify that appointment time does not overlap with hospital shifts (R1/R2 exempt)
    await conflictService.checkServiceConflictWithShifts(date, time);

    let effectiveCustomerId = inputCustomerId;

    // 2. Customer resolution: if customerId given, verify it exists; else if customerName given, create customer
    if (effectiveCustomerId) {
      const existing = await customerModel.findById(effectiveCustomerId);
      if (!existing && !customerName) {
        throw new AppError('Customer not found with the provided customerId', 404);
      }
    } else if (customerName) {
      const createdCustomer = await customerModel.create({
        name: customerName,
        phone: customerPhone || '',
        note: customerNote || '',
      });
      effectiveCustomerId = createdCustomer.id;
    }

    // 3. Create service record
    const serviceRecord = await customerServiceModel.create({
      customerId: effectiveCustomerId,
      serviceDate: date,
      serviceTime: time,
      serviceTypes: services,
      otherServiceText,
      medications,
      note,
      status: 'upcoming',
      price,
    });

    // 4. Fetch enriched service with customer details
    const fullService = await customerServiceModel.findById(serviceRecord.id);

    return {
      id: fullService.id,
      type: 'service',
      customerId: fullService.customerId,
      customerName: fullService.customerName || customerName || null,
      customerPhone: fullService.customerPhone || customerPhone || null,
      customerNote: fullService.customerNote || customerNote || null,
      date: fullService.date,
      time: fullService.time,
      services: fullService.services,
      otherServiceText: fullService.otherServiceText,
      medications: fullService.medications,
      note: fullService.note,
      status: fullService.status,
      price: fullService.price,
      createdAt: fullService.createdAt,
    };
  },

  /**
   * Update service status ('upcoming', 'completed', 'cancelled')
   */
  async updateStatus(id, status) {
    const existing = await customerServiceModel.findById(id);
    if (!existing) {
      throw new AppError('Customer service not found', 404);
    }

    const updated = await customerServiceModel.updateStatus(id, status);
    return {
      ...updated,
      type: 'service',
    };
  },

  /**
   * Delete a customer service
   */
  async deleteService(id) {
    const existing = await customerServiceModel.findById(id);
    if (!existing) {
      throw new AppError('Customer service not found', 404);
    }

    await customerServiceModel.deleteById(id);
    return {
      deletedServiceId: id,
    };
  },

  /**
   * Get customer services by query
   */
  async getServices(filter) {
    return customerServiceModel.findAll(filter);
  },
};
