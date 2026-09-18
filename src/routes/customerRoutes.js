import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  createCustomerAppointment,
} from '../controllers/customerController.js';
import { validate } from '../middlewares/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomersQuerySchema,
} from '../validators/customerValidator.js';
import { createAppointmentSchema } from '../validators/appointmentValidator.js';

const router = Router();

// Customer CRUD & Search
router.post('/', validate(createCustomerSchema), createCustomer);
router.get('/', validate(getCustomersQuerySchema), getCustomers);
router.get('/:id', validate(customerIdParamSchema), getCustomerById);
router.put('/:id', validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', validate(customerIdParamSchema), deleteCustomer);

// Customer Appointment
router.post('/:id/appointments', validate(createAppointmentSchema), createCustomerAppointment);

export default router;
