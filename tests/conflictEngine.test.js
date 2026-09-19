import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTimeInShift,
  conflictService,
} from '../src/services/conflictService.js';

describe('Conflict Detection Engine Tests', () => {
  it('should correctly determine isTimeInShift across all shift types and exemptions', () => {
    // 1. Morning Shift (08:00 - 16:00)
    assert.equal(isTimeInShift('08:00', 'morning'), true);
    assert.equal(isTimeInShift('14:00', 'morning'), true);
    assert.equal(isTimeInShift('15:59', 'morning'), true);
    assert.equal(isTimeInShift('16:00', 'morning'), false);
    assert.equal(isTimeInShift('07:59', 'morning'), false);

    // 2. Afternoon Shift (16:00 - 24:00)
    assert.equal(isTimeInShift('16:00', 'afternoon'), true);
    assert.equal(isTimeInShift('18:30', 'afternoon'), true);
    assert.equal(isTimeInShift('23:59', 'afternoon'), true);
    assert.equal(isTimeInShift('15:59', 'afternoon'), false);
    assert.equal(isTimeInShift('00:00', 'afternoon'), false);

    // 3. Night Shift (00:00 - 08:00)
    assert.equal(isTimeInShift('00:00', 'night'), true);
    assert.equal(isTimeInShift('03:30', 'night'), true);
    assert.equal(isTimeInShift('07:59', 'night'), true);
    assert.equal(isTimeInShift('08:00', 'night'), false);
    assert.equal(isTimeInShift('24:00', 'night'), true);

    // 4. Refer Shifts R1 and R2 are strictly EXEMPT
    assert.equal(isTimeInShift('08:00', 'r1'), false);
    assert.equal(isTimeInShift('14:00', 'r1'), false);
    assert.equal(isTimeInShift('20:00', 'r1'), false);
    assert.equal(isTimeInShift('10:00', 'r2'), false);
    assert.equal(isTimeInShift('16:00', 'r2'), false);
  });

  it('checkServiceConflictWithShifts blocks customer service during active hospital shifts', async () => {
    const mockDb = {
      query: async (sql, params) => {
        return {
          rows: [
            { id: 's1', shift: 'morning', category: 'black', status: 'active' },
          ],
        };
      },
    };

    // 14:00 is during morning shift (08:00 - 16:00) -> throws CONFLICT_WITH_SHIFT
    await assert.rejects(
      async () => {
        await conflictService.checkServiceConflictWithShifts('2026-09-20', '14:00', mockDb);
      },
      (err) => {
        assert.equal(err.code, 'CONFLICT_WITH_SHIFT');
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('ตรงกับช่วงเวลาเวรเช้า'));
        return true;
      }
    );

    // 17:00 is outside morning shift -> does NOT throw
    await assert.doesNotReject(async () => {
      await conflictService.checkServiceConflictWithShifts('2026-09-20', '17:00', mockDb);
    });
  });

  it('checkServiceConflictWithShifts allows customer service when nurse only has R1 or R2 shifts', async () => {
    const mockDb = {
      query: async (sql, params) => {
        return {
          rows: [
            { id: 's-r1', shift: 'r1', category: 'green', status: 'active' },
          ],
        };
      },
    };

    // Any time is allowed on R1 shift days
    await assert.doesNotReject(async () => {
      await conflictService.checkServiceConflictWithShifts('2026-09-25', '14:00', mockDb);
    });
  });

  it('checkShiftConflictWithServices blocks booking hospital shift if customer appointment exists during that period', async () => {
    const mockDb = {
      query: async (sql, params) => {
        return {
          rows: [
            {
              id: 'cs-1',
              service_time: '16:30:00',
              status: 'upcoming',
              customer_name: 'คุณยายสมศรี สุขเกษม',
            },
          ],
        };
      },
    };

    // Afternoon shift (16:00 - 24:00) conflicts with 16:30 service -> throws CONFLICT_WITH_SERVICE
    await assert.rejects(
      async () => {
        await conflictService.checkShiftConflictWithServices('2026-09-24', 'afternoon', mockDb);
      },
      (err) => {
        assert.equal(err.code, 'CONFLICT_WITH_SERVICE');
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('คุณยายสมศรี สุขเกษม'));
        assert.ok(err.message.includes('16:30'));
        return true;
      }
    );

    // Morning shift (08:00 - 16:00) does NOT conflict with 16:30 service -> does NOT throw
    await assert.doesNotReject(async () => {
      await conflictService.checkShiftConflictWithServices('2026-09-24', 'morning', mockDb);
    });

    // R1 / R2 shift is exempt -> does NOT throw even if service exists
    await assert.doesNotReject(async () => {
      await conflictService.checkShiftConflictWithServices('2026-09-24', 'r1', mockDb);
    });
  });
});
