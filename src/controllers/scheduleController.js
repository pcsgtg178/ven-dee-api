import { shiftModel, formatShiftRow } from '../models/shiftModel.js';
import { customerServiceModel } from '../models/customerServiceModel.js';
import { serviceTodoModel } from '../models/serviceTodoModel.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { toDateString } from '../utils/shiftHelper.js';
import { SHIFT_TIME_RANGES } from '../services/conflictService.js';

export const getActivities = async (req, res, next) => {
  try {
    const month = req.query.month || toDateString(new Date()).substring(0, 7);
    const type = req.query.type || 'all'; // 'all' | 'shift' | 'service'

    const activities = [];

    // 1. Fetch shifts if requested
    if (type === 'all' || type === 'shift') {
      const shiftRows = await shiftModel.findAll({ month, status: 'all' });
      for (const row of shiftRows) {
        const shiftEntity = formatShiftRow(row);
        const shiftInfo = SHIFT_TIME_RANGES[shiftEntity.shiftType] || {
          label: shiftEntity.shiftType,
          start: '00:00',
          end: '24:00',
        };

        activities.push({
          id: shiftEntity.id,
          type: 'shift',
          date: shiftEntity.date,
          time: shiftInfo.start || '00:00',
          endTime: shiftInfo.end || null,
          title: `ขึ้นเวร: ${shiftInfo.label}`,
          shiftType: shiftEntity.shiftType,
          category: shiftEntity.category,
          status: shiftEntity.status,
          department: shiftEntity.department,
          note: shiftEntity.note,
          isLocked: shiftEntity.isLocked,
          swapMeta: shiftEntity.swapMeta || null,
          createdAt: shiftEntity.createdAt,
        });
      }
    }

    // 2. Fetch customer services if requested
    if (type === 'all' || type === 'service') {
      const services = await customerServiceModel.findAll({ month, status: 'all' });
      for (const srv of services) {
        const srvNames = Array.isArray(srv.services) ? srv.services.join(', ') : 'บริการ';
        activities.push({
          id: srv.id,
          type: 'service',
          date: toDateString(srv.date),
          time: srv.time ? srv.time.substring(0, 5) : '00:00',
          title: srv.customerName ? `${srv.customerName} (${srvNames})` : `บริการลูกค้า (${srvNames})`,
          customerId: srv.customerId,
          customerName: srv.customerName,
          customerPhone: srv.customerPhone,
          customerNote: srv.customerNote,
          services: srv.services,
          medications: srv.medications,
          note: srv.note,
          status: srv.status,
          price: srv.price,
          createdAt: srv.createdAt,
        });
      }
    }

    // 3. Sort chronologically by date ASC, then time ASC
    activities.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.time || '').localeCompare(b.time || '');
    });

    return sendSuccess(res, activities, 'ดึงฟีดกิจกรรมตารางงานรวมสำเร็จ');
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode, error.code, error.details);
    }
    next(error);
  }
};
