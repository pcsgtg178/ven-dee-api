import { z } from 'zod';

export const shiftTypesEnum = z.enum(['morning', 'afternoon', 'night', 'r1', 'r2'], {
  required_error: 'shiftType is required (morning, afternoon, night, r1, r2)',
});

export const shiftCategoryEnum = z.enum(['black', 'red', 'green']).default('black');

export const shiftStatusEnum = z.enum(['active', 'swapped_out', 'cancelled', 'all']).default('active');

export const getShiftsQuerySchema = z.object({
  query: z
    .object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status: shiftStatusEnum.optional(),
      category: z.enum(['black', 'red', 'green']).optional(),
    })
    .optional(),
});

export const createShiftSchema = z.object({
  body: z.object({
    date: z
      .string({ required_error: 'Date is required (YYYY-MM-DD)' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    shiftType: z.enum(['morning', 'afternoon', 'night', 'r1', 'r2']).optional(),
    shift: z.enum(['morning', 'afternoon', 'night', 'r1', 'r2']).optional(),
    category: z.enum(['black', 'red', 'green']).optional().default('black'),
    department: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }).superRefine((data, ctx) => {
    if (!data.shiftType && !data.shift) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'shiftType is required (morning, afternoon, night, r1, r2)',
        path: ['shiftType'],
      });
    }
  }),
});

export const updateShiftSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid shift ID format'),
  }),
  body: z.object({
    department: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }),
});

export const shiftIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid shift ID format'),
  }),
});

export const simulateQuotaSchema = z.object({
  body: z.object({
    shiftId: z.string().min(1, 'Invalid shift ID format').optional(),
    newCategory: z.enum(['black', 'red', 'green'], {
      required_error: 'newCategory is required (black, red, green)',
    }),
    targetDate: z
      .string({ required_error: 'targetDate is required (YYYY-MM-DD)' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }),
});

export const swapShiftSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid shift ID format'),
  }),
  body: z
    .object({
      newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      newShiftType: z.enum(['morning', 'afternoon', 'night', 'r1', 'r2']).optional(),
      shift: z.enum(['morning', 'afternoon', 'night', 'r1', 'r2']).optional(),
      newCategory: z.enum(['black', 'red', 'green']).optional(),
      category: z.enum(['black', 'red', 'green']).optional(),
      swappedWith: z
        .string({ required_error: 'swappedWith is required' })
        .min(1, 'swappedWith cannot be empty'),
      originalOwner: z.string().optional().nullable(),
      swapReason: z.string().optional().nullable(),
      swapNote: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      if (!data.newDate && !data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Date is required (YYYY-MM-DD)',
          path: ['newDate'],
        });
      }
      if (!data.newShiftType && !data.shift) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Shift type is required (morning, afternoon, night, r1, r2)',
          path: ['newShiftType'],
        });
      }
    }),
});

export const cancelSwapSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid shift ID format'),
  }),
  body: z
    .object({
      note: z.string().optional().nullable().default(''),
      reason: z.string().optional().nullable(),
    })
    .optional()
    .default({}),
});

export const shiftChainSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid shift ID format'),
  }),
});
