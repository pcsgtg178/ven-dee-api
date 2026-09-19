import { customerModel } from '../models/customerModel.js';
import { customerServiceModel } from '../models/customerServiceModel.js';
import { serviceTodoModel } from '../models/serviceTodoModel.js';
import { appointmentModel } from '../models/appointmentModel.js';
import { AppError } from '../utils/responseHandler.js';
import { toDateString } from '../utils/shiftHelper.js';

export const customerService = {
  /**
   * Create a new customer
   */
  async createCustomer(data) {
    return customerModel.create(data);
  },

  /**
   * List or search customers
   */
  async getCustomers(filter) {
    return customerModel.findAll(filter);
  },

  /**
   * Get customer details along with upcoming and history services
   */
  async getCustomerById(id) {
    const customer = await customerModel.findById(id);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const [servicesList, legacyServices, appointments] = await Promise.all([
      customerServiceModel.findAll({ customerId: id }),
      serviceTodoModel.findByCustomerId(id),
      appointmentModel.findByCustomerId(id),
    ]);

    const todayStr = toDateString(new Date());

    const upcomingServices = servicesList.filter((s) => {
      return s.status === 'upcoming' && s.date >= todayStr;
    });

    const historyServices = servicesList.filter((s) => {
      return s.status === 'completed' || s.date < todayStr || s.status === 'cancelled';
    });

    return {
      ...customer,
      upcomingServices,
      historyServices,
      // Backward-compatibility:
      servicesHistory: legacyServices.length > 0 ? legacyServices : servicesList,
      appointments,
    };
  },

  /**
   * Update customer information
   */
  async updateCustomer(id, data) {
    const existing = await customerModel.findById(id);
    if (!existing) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const updated = await customerModel.update(id, data);
    if (!updated) {
      throw new AppError('No fields provided for update', 400, 'NO_FIELDS_TO_UPDATE');
    }

    return updated;
  },

  /**
   * Delete a customer by id
   */
  async deleteCustomer(id) {
    const deleted = await customerModel.deleteById(id);
    if (!deleted) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }
    return deleted;
  },

  /**
   * Create an appointment for customer
   */
  async createAppointment(customerId, appointmentData) {
    const customer = await customerModel.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    return appointmentModel.create({
      customerId,
      ...appointmentData,
    });
  },
};
