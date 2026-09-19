import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isShiftTimePassed,
  countActiveBlackShiftsInMonth,
  formatShiftEvent,
  toDateString,
} from '../src/utils/shiftHelper.js';

describe('Shift Helper Utility Tests', () => {
  it('should correctly format dates to YYYY-MM-DD', () => {
    assert.equal(toDateString('2026-09-19T04:18:01Z'), '2026-09-19');
    assert.equal(toDateString('2026-10-01'), '2026-10-01');
    const dateObj = new Date(2026, 8, 25); // Month is 0-indexed: 8 = Sep
    assert.equal(toDateString(dateObj), '2026-09-25');
  });

  it('should detect past dates as passed', () => {
    // Yesterday or a past date
    const pastDate = '2020-01-01';
    assert.equal(isShiftTimePassed(pastDate, 'morning'), true);
    assert.equal(isShiftTimePassed(pastDate, 'night'), true);
  });

  it('should detect future dates as not passed', () => {
    // Far future date
    const futureDate = '2099-12-31';
    assert.equal(isShiftTimePassed(futureDate, 'morning'), false);
    assert.equal(isShiftTimePassed(futureDate, 'afternoon'), false);
    assert.equal(isShiftTimePassed(futureDate, 'night'), false);
  });

  it('should evaluate today shifts based on standard hospital shift hours', () => {
    const now = new Date();
    const todayStr = toDateString(now);

    // If current hour is >= 8, night shift has passed
    const currentHour = now.getHours();
    const nightPassed = isShiftTimePassed(todayStr, 'night');
    if (currentHour >= 8) {
      assert.equal(nightPassed, true);
    } else {
      assert.equal(nightPassed, false);
    }
  });

  it('should format shift event object properly with extendedProps and locks', () => {
    const mockShiftRow = {
      id: 'b1d5f308-568b-4a87-9812-3c1d9b3a5f6e',
      shift: 'morning',
      date: '2020-01-15', // Past date
      category: 'black',
      status: 'active',
      is_locked: false,
      parent_shift_id: null,
      swapped_with: null,
      original_owner: 'Nurse Somchai',
      swap_note: null,
      created_at: new Date('2020-01-01'),
      updated_at: new Date('2020-01-01'),
    };

    const event = formatShiftEvent(mockShiftRow);

    assert.equal(event.id, mockShiftRow.id);
    assert.equal(event.isLocked, true); // Automatic evaluation because 2020 is past
    assert.equal(event.category, 'black');
    assert.equal(event.status, 'active');
    assert.equal(event.extendedProps.originalOwner, 'Nurse Somchai');
    assert.equal(event.extendedProps.isLocked, true);
    assert.ok(event.title.includes('เวรเช้า'));
  });

  it('should calculate active black shift quota in month', async () => {
    // Mock DB client returning 12 shifts
    const mockClient = {
      query: async (sql, params) => {
        return {
          rows: [{ count: 12 }],
        };
      },
    };

    const result = await countActiveBlackShiftsInMonth(mockClient, '2026-09-19');
    assert.equal(result.count, 12);
    assert.equal(result.blackShiftWarning, true);
    assert.equal(result.missingBlackShifts, 2); // 14 - 12 = 2
  });

  it('should not trigger warning when active black shifts >= 14', async () => {
    const mockClient = {
      query: async (sql, params) => {
        return {
          rows: [{ count: 15 }],
        };
      },
    };

    const result = await countActiveBlackShiftsInMonth(mockClient, '2026-09-19');
    assert.equal(result.count, 15);
    assert.equal(result.blackShiftWarning, false);
    assert.equal(result.missingBlackShifts, 0);
  });
});
