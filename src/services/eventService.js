import { shiftModel } from '../models/shiftModel.js';
import { serviceTodoModel } from '../models/serviceTodoModel.js';
import { formatShiftEvent } from '../utils/shiftHelper.js';

export const eventService = {
  /**
   * Get combined schedule events (Shift and Service) in FullCalendar Event Object format
   */
  async getEvents({ start, end, includeSwapped } = {}) {
    const isIncludeSwapped = includeSwapped === 'true';

    // 1. Fetch and format shift todos
    const shiftRows = await shiftModel.findEvents({
      start,
      end,
      includeSwapped: isIncludeSwapped,
    });
    const shiftEvents = shiftRows.map((row) => formatShiftEvent(row));

    // 2. Fetch and format service todos
    const serviceRows = await serviceTodoModel.findEvents({ start, end });
    const serviceEvents = serviceRows.map((row) => ({
      id: row.id,
      title: row.title,
      start: row.start_time,
      end: row.end_time,
      allDay: row.all_day,
      backgroundColor: row.background_color || '#3788d8',
      borderColor: row.border_color || '#3788d8',
      extendedProps: {
        type: 'service',
        customerId: row.customer_id,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        customerNote: row.customer_note || '',
        services: row.services || [],
        medicines: row.medicines || [],
        note: row.note || '',
      },
      createdAt: row.created_at,
    }));

    // 3. Combine and sort by createdAt descending
    const combinedEvents = [...shiftEvents, ...serviceEvents].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return combinedEvents;
  },
};
