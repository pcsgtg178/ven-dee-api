import { pool } from '../config/db.js';
import { shiftModel, formatShiftRow } from '../models/shiftModel.js';
import { shiftSwapLogModel } from '../models/shiftSwapLogModel.js';
import { conflictService, SHIFT_TIME_RANGES } from './conflictService.js';
import { AppError } from '../utils/responseHandler.js';
import {
  isShiftTimePassed,
  countActiveBlackShiftsInMonth,
  formatShiftEvent,
  toDateString,
} from '../utils/shiftHelper.js';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const formatThaiMonthYear = (dateStr) => {
  const [yearStr, monthStr] = dateStr.split('-');
  const yearBe = parseInt(yearStr, 10) + 543;
  const monthName = THAI_MONTHS[parseInt(monthStr, 10) - 1] || monthStr;
  return `${monthName} ${yearBe}`;
};

export const shiftService = {
  /**
   * Get shifts list with filtering
   */
  async getShifts(filter) {
    const rows = await shiftModel.findAll(filter);
    return rows.map((r) => formatShiftRow(r));
  },

  /**
   * Create a new shift with Duplicate and Customer Service conflict checks
   */
  async createShift(data) {
    const {
      date,
      shiftType: inputShiftType,
      shift: inputShift,
      category = 'black',
      department = null,
      note = null,
    } = data;

    const shiftType = inputShiftType || inputShift;
    const dateStr = toDateString(date);

    // 1. Business Validation: Duplicate shift check on date
    const duplicate = await shiftModel.findActiveDuplicate(dateStr, shiftType);
    if (duplicate) {
      throw new AppError(
        `มีเวรประเภทเดียวกัน (${shiftType}) ในวันที่ ${dateStr} อยู่แล้ว`,
        409,
        'DUPLICATE_SHIFT',
        [{ field: 'shiftType', issue: `มีเวร ${shiftType} ในวันที่ ${dateStr} อยู่แล้ว` }]
      );
    }

    // 2. Business Validation: Conflict check with customer service (R1/R2 exempt)
    await conflictService.checkShiftConflictWithServices(dateStr, shiftType);

    // 3. Create record
    const created = await shiftModel.create({
      shiftType,
      date: dateStr,
      category,
      department,
      note,
      status: 'active',
      isLocked: false,
    });

    return formatShiftRow(created);
  },

  /**
   * Update shift department or note (checks isLocked)
   */
  async updateShift(id, data) {
    const existing = await shiftModel.findById(id);
    if (!existing) {
      throw new AppError('Shift not found', 404, 'NOT_FOUND');
    }

    const isLocked = Boolean(
      existing.is_locked || isShiftTimePassed(existing.date, existing.shift)
    );
    if (isLocked) {
      throw new AppError(
        'เวรผ่านพ้นเวลาไปแล้ว ห้ามแก้ไขหรือยกเลิก',
        400,
        'SHIFT_IS_LOCKED'
      );
    }

    const updated = await shiftModel.update(id, data);
    return formatShiftRow(updated);
  },

  /**
   * Delete shift with parent auto-restore
   */
  async deleteShift(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await shiftModel.findByIdForUpdate(id, client);
      if (!existing) {
        throw new AppError('Shift not found', 404, 'NOT_FOUND');
      }

      const isLocked = Boolean(
        existing.is_locked || isShiftTimePassed(existing.date, existing.shift)
      );
      if (isLocked) {
        throw new AppError(
          'เวรผ่านพ้นเวลาไปแล้ว ห้ามแก้ไขหรือยกเลิก',
          400,
          'SHIFT_IS_LOCKED'
        );
      }

      let restoredParentId = null;

      // If shift came from a swap (parent_shift_id is set), auto-restore original parent shift!
      if (existing.parent_shift_id) {
        await shiftModel.updateStatus(existing.parent_shift_id, 'active', client);
        restoredParentId = existing.parent_shift_id;
      }

      await shiftModel.deleteById(id, client);

      await client.query('COMMIT');

      return {
        deletedShiftId: id,
        restoredParentId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Restore inactive/swapped_out shift back to active
   */
  async restoreShift(id) {
    const existing = await shiftModel.findById(id);
    if (!existing) {
      throw new AppError('Shift not found', 404, 'NOT_FOUND');
    }

    const updated = await shiftModel.updateStatus(id, 'active');
    return formatShiftRow(updated);
  },

  /**
   * Simulate quota impact of changing a shift category to red or green
   */
  async simulateQuotaImpact({ shiftId, newCategory, targetDate }) {
    const dateStr = toDateString(targetDate);
    const quotaInfo = await countActiveBlackShiftsInMonth(pool, dateStr);

    let currentBlackCount = quotaInfo.count;
    let simulatedBlackCount = currentBlackCount;

    // If source shift is black and new category is not black, simulated black count decreases by 1
    if (newCategory !== 'black') {
      simulatedBlackCount = Math.max(0, currentBlackCount - 1);
    }

    const quota = 14;
    const willBeUnderQuota = simulatedBlackCount < quota;
    const remainingNeeded = willBeUnderQuota ? quota - simulatedBlackCount : 0;
    const monthName = formatThaiMonthYear(dateStr);

    let warningMessage = null;
    if (willBeUnderQuota) {
      warningMessage = `หากแลกเป็นเวรแดง จะทำให้จำนวนเวรดำในเดือน${monthName} เหลือเพียง ${simulatedBlackCount}/${quota} วัน (ขาดอีก ${remainingNeeded} วัน) ยืนยันที่จะดำเนินการหรือไม่?`;
    }

    return {
      currentBlackCount,
      simulatedBlackCount,
      quota,
      remainingNeeded,
      willBeUnderQuota,
      monthName,
      warningMessage,
    };
  },

  /**
   * Swap a shift with another person (supports multi-hop swap)
   */
  async swapShift(sourceShiftId, swapData) {
    const client = await pool.connect();
    try {
      const {
        date: inputDate,
        newDate,
        shift: inputShift,
        newShiftType,
        category = 'black',
        newCategory,
        swappedWith,
        originalOwner,
        swapNote,
        swapReason,
      } = swapData;

      const date = toDateString(newDate || inputDate);
      const shift = newShiftType || inputShift;
      const effectiveCategory = newCategory || category || 'black';
      const effectiveReason = swapReason || swapNote || '';

      await client.query('BEGIN');

      // 1. Check source shift: must have status = 'active' and isLocked = false
      const sourceShift = await shiftModel.findByIdForUpdate(sourceShiftId, client);
      if (!sourceShift) {
        throw new AppError('Source shift not found', 404, 'NOT_FOUND');
      }

      if (sourceShift.status !== 'active') {
        throw new AppError(
          `Cannot swap shift: status must be 'active', but is currently '${sourceShift.status}'`,
          400,
          'INVALID_STATUS'
        );
      }

      const sourceIsLocked = Boolean(
        sourceShift.is_locked || isShiftTimePassed(sourceShift.date, sourceShift.shift)
      );
      if (sourceIsLocked) {
        throw new AppError('Shift is locked and cannot be swapped', 400, 'SHIFT_IS_LOCKED');
      }

      // 2. Conflict Validation: Duplicate active shift on target date
      const duplicate = await shiftModel.findActiveDuplicate(date, shift, null, client);
      if (duplicate) {
        throw new AppError(
          `มีเวรประเภทเดียวกัน (${shift}) ในวันที่ ${date} อยู่แล้ว`,
          409,
          'DUPLICATE_SHIFT'
        );
      }

      // 3. Conflict Validation: Conflict with customer service on target date
      await conflictService.checkShiftConflictWithServices(date, shift, client);

      // 4. Change source shift status to 'swapped_out'
      const updatedSourceShift = await shiftModel.updateStatus(
        sourceShiftId,
        'swapped_out',
        client
      );

      // 5. Create new shift: status = 'active', parentShiftId = :id
      const effectiveOriginalOwner =
        originalOwner || sourceShift.original_owner || swappedWith;

      const newShift = await shiftModel.create(
        {
          type: 'shift',
          shift,
          date,
          category: effectiveCategory,
          status: 'active',
          isLocked: false,
          parentShiftId: sourceShiftId,
          swappedWith,
          originalOwner: effectiveOriginalOwner,
          swapNote: effectiveReason,
          swapReason: effectiveReason,
        },
        client
      );

      // 6. Calculate active black shifts in target month (and source month if different)
      const quotaInfo = await countActiveBlackShiftsInMonth(client, date);

      let sourceMonthQuota = null;
      const sourceDateStr = toDateString(sourceShift.date);
      const targetDateStr = toDateString(date);
      const sourceMonthStr = sourceDateStr.substring(0, 7);
      const targetMonthStr = targetDateStr.substring(0, 7);

      if (sourceMonthStr !== targetMonthStr && sourceShift.category === 'black') {
        sourceMonthQuota = await countActiveBlackShiftsInMonth(client, sourceShift.date);
      }

      const hasWarning =
        quotaInfo.blackShiftWarning || Boolean(sourceMonthQuota?.blackShiftWarning);
      const missingDays = hasWarning
        ? Math.max(quotaInfo.missingBlackShifts, sourceMonthQuota?.missingBlackShifts || 0)
        : 0;

      // 7. Record swap log / audit trail
      const swapLog = await shiftSwapLogModel.create(
        {
          action: 'swap',
          sourceShiftId,
          targetShiftId: newShift.id,
          swappedWith,
          originalOwner: effectiveOriginalOwner,
          note: effectiveReason,
        },
        client
      );

      // Record to shift_swap_transactions & swap_trail_nodes if tables exist
      try {
        const txRes = await client.query(
          `INSERT INTO shift_swap_transactions (old_shift_id, new_shift_id, partner_name, original_owner, swap_date, reason, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'completed') RETURNING id;`,
          [sourceShiftId, newShift.id, swappedWith, effectiveOriginalOwner, toDateString(new Date()), effectiveReason]
        );
        const txId = txRes.rows[0]?.id;

        if (txId) {
          const shiftInfo = SHIFT_TIME_RANGES[shift] || { label: shift, period: '' };
          const shiftLabel = `${shiftInfo.label} (${shiftInfo.period})`;

          if (originalOwner) {
            // Hop 1: originalOwner -> swappedWith
            await client.query(
              `INSERT INTO swap_trail_nodes (shift_id, transaction_id, step_order, from_person, to_person, node_date, shift_label, note)
               VALUES ($1, $2, 1, $3, $4, $5, $6, $7);`,
              [newShift.id, txId, `${originalOwner} (เจ้าของเดิมตามตาราง)`, swappedWith, toDateString(new Date()), shiftLabel, 'แลกเปลี่ยนเวรตามตารางประจำสัปดาห์']
            );
            // Hop 2: swappedWith -> ฉัน
            await client.query(
              `INSERT INTO swap_trail_nodes (shift_id, transaction_id, step_order, from_person, to_person, node_date, shift_label, note)
               VALUES ($1, $2, 2, $3, 'ฉัน (ผู้ใช้งาน)', $4, $5, $6);`,
              [newShift.id, txId, swappedWith, toDateString(new Date()), shiftLabel, effectiveReason || 'ส่งต่อแลกเวรต่อยอด (Top-up Swap)']
            );
          } else {
            // Direct Hop: swappedWith -> ฉัน
            await client.query(
              `INSERT INTO swap_trail_nodes (shift_id, transaction_id, step_order, from_person, to_person, node_date, shift_label, note)
               VALUES ($1, $2, 1, $3, 'ฉัน (ผู้ใช้งาน)', $4, $5, $6);`,
              [newShift.id, txId, swappedWith, toDateString(new Date()), shiftLabel, effectiveReason || 'แลกเปลี่ยนเวรโดยตรง']
            );
          }
        }
      } catch (_) {}

      await client.query('COMMIT');

      const formattedNewShift = formatShiftRow(newShift);
      formattedNewShift.extendedProps = {
        type: 'shift',
        shift: newShift.shift,
        category: newShift.category,
        status: newShift.status,
        isLocked: Boolean(newShift.is_locked),
        parentShiftId: newShift.parent_shift_id,
        swappedWith: newShift.swapped_with,
        originalOwner: newShift.original_owner,
        swapNote: newShift.swap_note,
      };

      return {
        oldShift: {
          id: sourceShiftId,
          status: 'swapped_out',
        },
        newShift: formattedNewShift,
        // Backward-compatible fields:
        sourceShift: formatShiftEvent(updatedSourceShift),
        swapLog: {
          id: swapLog.id,
          action: swapLog.action,
          sourceShiftId: swapLog.source_shift_id,
          targetShiftId: swapLog.target_shift_id,
          swappedWith: swapLog.swapped_with,
          originalOwner: swapLog.original_owner,
          note: swapLog.note,
          timestamp: swapLog.timestamp,
        },
        blackShiftWarning: hasWarning,
        blackShiftCount: quotaInfo.count,
        missingBlackShifts: missingDays,
        quotaDetails: {
          targetMonth: quotaInfo,
          ...(sourceMonthQuota ? { sourceMonth: sourceMonthQuota } : {}),
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Cancel a shift swap and restore parent shift (Undo Swap)
   */
  async cancelSwap(currentShiftId, { note = 'Swap cancelled', reason } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const effectiveNote = reason || note;

      // 1. Verify current shift
      const currentShift = await shiftModel.findByIdForUpdate(currentShiftId, client);
      if (!currentShift) {
        throw new AppError('Shift not found', 404, 'NOT_FOUND');
      }

      if (!currentShift.parent_shift_id) {
        throw new AppError(
          'Cannot cancel swap: This shift has no parent shift (not created by a swap)',
          400,
          'PARENT_SHIFT_NOT_FOUND'
        );
      }

      if (currentShift.status === 'cancelled') {
        throw new AppError('This shift swap is already cancelled', 400, 'ALREADY_CANCELLED');
      }

      // Verify parent shift
      const parentShift = await shiftModel.findByIdForUpdate(
        currentShift.parent_shift_id,
        client
      );
      if (!parentShift) {
        throw new AppError('Parent shift not found in records', 404, 'PARENT_SHIFT_NOT_FOUND');
      }

      // Check if current shift or parent shift has passed current time
      const isCurrentLocked = Boolean(
        currentShift.is_locked || isShiftTimePassed(currentShift.date, currentShift.shift)
      );
      const isParentLocked = Boolean(
        parentShift.is_locked || isShiftTimePassed(parentShift.date, parentShift.shift)
      );

      if (isCurrentLocked || isParentLocked) {
        throw new AppError('Shift is locked and cannot be undone', 400, 'SHIFT_IS_LOCKED');
      }

      // 2. Change current shift status to 'cancelled'
      const updatedCurrentShift = await shiftModel.updateStatus(
        currentShiftId,
        'cancelled',
        client
      );

      // 3. Restore parent shift to 'active'
      const restoredParentShift = await shiftModel.updateStatus(
        currentShift.parent_shift_id,
        'active',
        client
      );

      // 4. Log cancel_swap
      const swapLog = await shiftSwapLogModel.create(
        {
          action: 'cancel_swap',
          sourceShiftId: parentShift.id,
          targetShiftId: currentShift.id,
          swappedWith: currentShift.swapped_with,
          originalOwner: currentShift.original_owner,
          note: effectiveNote,
        },
        client
      );

      await client.query('COMMIT');

      return {
        cancelledShiftId: currentShiftId,
        restoredShiftId: parentShift.id,
        restoredParentId: parentShift.id,
        // Backward compatible fields:
        cancelledShift: formatShiftEvent(updatedCurrentShift),
        restoredShift: formatShiftEvent(restoredParentShift),
        swapLog: {
          id: swapLog.id,
          action: swapLog.action,
          sourceShiftId: swapLog.source_shift_id,
          targetShiftId: swapLog.target_shift_id,
          swappedWith: swapLog.swapped_with,
          originalOwner: swapLog.original_owner,
          note: swapLog.note,
          timestamp: swapLog.timestamp,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get full audit trail chain and timeline from root node to current node
   */
  async getShiftChain(shiftId) {
    const currentShift = await shiftModel.findById(shiftId);
    if (!currentShift) {
      throw new AppError('Shift not found', 404, 'NOT_FOUND');
    }

    // Trace ancestors
    const orderedChain = await shiftModel.findAncestors(currentShift);

    // Fetch swap logs connecting these nodes
    const nodeIds = orderedChain.map((n) => n.id);
    const logs = await shiftSwapLogModel.findByShiftIds(nodeIds);

    // Build timeline
    const shiftInfo = SHIFT_TIME_RANGES[currentShift.shift] || { label: currentShift.shift, period: '' };
    const shiftLabel = `${shiftInfo.label} (${shiftInfo.period})`;

    const timeline = [];
    let stepCount = 1;

    for (let i = 1; i < orderedChain.length; i++) {
      const prevNode = orderedChain[i - 1];
      const currNode = orderedChain[i];
      const hopLog = logs.find(
        (l) => l.target_shift_id === currNode.id && l.action === 'swap'
      );

      timeline.push({
        step: stepCount++,
        fromPerson: currNode.original_owner || prevNode.swapped_with || 'เจ้าของเดิม',
        toPerson: currNode.swapped_with || 'ฉัน (ผู้ใช้งาน)',
        date: toDateString(hopLog?.timestamp || currNode.created_at),
        shiftLabel,
        note: hopLog?.note || currNode.swap_note || 'แลกเปลี่ยนเวร',
      });
    }

    if (timeline.length === 0 && currentShift.swapped_with) {
      timeline.push({
        step: 1,
        fromPerson: currentShift.original_owner || currentShift.swapped_with,
        toPerson: 'ฉัน (ผู้ใช้งาน)',
        date: toDateString(currentShift.created_at),
        shiftLabel,
        note: currentShift.swap_note || 'แลกเปลี่ยนเวร',
      });
    }

    // Map chain nodes with hop details for backward compatibility
    const auditTrail = orderedChain.map((node, index) => {
      const isRoot = index === 0;
      const isCurrent = node.id === shiftId;

      const hopLog = logs.find(
        (l) => l.target_shift_id === node.id && l.action === 'swap'
      );

      return {
        hopIndex: index,
        isRootNode: isRoot,
        isTargetNode: isCurrent,
        shift: formatShiftEvent(node),
        swapDetails: hopLog
          ? {
              action: hopLog.action,
              swappedWith: hopLog.swapped_with,
              originalOwner: hopLog.original_owner,
              swapNote: hopLog.note,
              timestamp: hopLog.timestamp,
            }
          : null,
      };
    });

    return {
      currentShiftId: shiftId,
      currentHolder: 'ฉัน (ผู้ใช้งาน)',
      shiftDate: toDateString(currentShift.date),
      shiftLabel,
      timeline,
      // Backward compatible fields:
      rootShiftId: orderedChain[0]?.id,
      totalHops: orderedChain.length - 1,
      chainLength: orderedChain.length,
      auditTrail,
      allLogs: logs,
    };
  },
};
