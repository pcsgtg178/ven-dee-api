import { shiftModel } from '../models/shiftModel.js';
import { serviceTodoModel } from '../models/serviceTodoModel.js';
import { customerModel } from '../models/customerModel.js';
import { formatShiftEvent } from '../utils/shiftHelper.js';

export const todoService = {
  /**
   * Create a new shift todo
   */
  async createShiftTodo(data) {
    const {
      shift,
      date,
      category = 'black',
      originalOwner = null,
      swapNote = null,
    } = data;

    const row = await shiftModel.create({
      type: 'shift',
      shift,
      date,
      category,
      originalOwner,
      swapNote,
    });

    return formatShiftEvent(row);
  },

  /**
   * Create a new service todo (customer service appointment)
   */
  async createServiceTodo(data) {
    const {
      title,
      start,
      end = null,
      allDay = false,
      backgroundColor = '#3788d8',
      borderColor = '#3788d8',
      customerId = null,
      customerName: inputCustomerName,
      customerPhone: inputCustomerPhone,
      customerNote: inputCustomerNote,
      services,
      medicines = [],
      note = '',
    } = data;

    let custName = inputCustomerName || '';
    let custPhone = inputCustomerPhone || '';
    let custNote = inputCustomerNote || '';

    // If customerId is provided, enrich customer details from DB if needed
    if (customerId) {
      const customer = await customerModel.findById(customerId);
      if (customer) {
        custName = custName || customer.name;
        custPhone = custPhone || customer.phone;
        custNote = custNote || customer.note;
      }
    }

    const eventTitle =
      title || (custName ? `${custName} (${services.join(', ')})` : 'บริการลูกค้า');

    const row = await serviceTodoModel.create({
      title: eventTitle,
      start,
      end,
      allDay,
      backgroundColor,
      borderColor,
      customerId,
      services,
      medicines,
      note,
    });

    return {
      id: row.id,
      title: row.title,
      start: row.start,
      end: row.end,
      allDay: row.allDay,
      backgroundColor: row.backgroundColor,
      borderColor: row.borderColor,
      extendedProps: {
        type: 'service',
        customerId: row.customerId,
        customerName: custName,
        customerPhone: custPhone,
        customerNote: custNote,
        services: row.services,
        medicines: row.medicines,
        note: row.note,
      },
      createdAt: row.createdAt,
    };
  },
};
