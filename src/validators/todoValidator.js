import { z } from 'zod';

export const createShiftTodoSchema = z.object({
  body: z.object({
    shift: z.enum(['morning', 'afternoon', 'night', 'r1', 'r2'], {
      required_error: 'Shift type is required (morning, afternoon, night, r1, r2)',
    }),
    date: z.string({ required_error: 'Date is required (YYYY-MM-DD)' }),
    category: z.enum(['black', 'red', 'green']).optional().default('black'),
    originalOwner: z.string().optional().nullable(),
    swapNote: z.string().optional().nullable(),
  }),
});

export const createServiceTodoSchema = z.object({
  body: z
    .object({
      title: z.string().optional(),
      start: z.string({ required_error: 'Start date/time is required' }),
      end: z.string().optional().nullable(),
      allDay: z.boolean().optional().default(false),
      backgroundColor: z.string().optional().nullable(),
      borderColor: z.string().optional().nullable(),
      customerId: z.string().uuid('Invalid customer ID format').optional().nullable(),
      customerName: z.string().optional().nullable(),
      customerPhone: z.string().optional().nullable(),
      customerNote: z.string().optional().nullable(),
      services: z
        .array(z.enum(['injection', 'drip', 'delivery', 'other']), {
          required_error: 'Services array is required',
        })
        .min(1, 'At least one service must be selected'),
      medicines: z.array(z.string()).optional().default([]),
      note: z.string().optional().nullable().default(''),
    })
    .superRefine((data, ctx) => {
      if (data.services.includes('injection')) {
        if (!data.medicines || data.medicines.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Medicines list is required when 'injection' service is selected",
            path: ['medicines'],
          });
        }
      }
    }),
});
