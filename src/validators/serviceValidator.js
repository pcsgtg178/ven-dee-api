import { z } from 'zod';

export const createServiceSchema = z.object({
  body: z
    .object({
      customerId: z.string().min(1, 'Invalid customer ID format').optional().nullable(),
      customerName: z.string().optional().nullable(),
      customerPhone: z.string().optional().nullable(),
      customerNote: z.string().optional().nullable(),
      date: z
        .string({ required_error: 'date is required (YYYY-MM-DD)' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
      time: z
        .string({ required_error: 'time is required (HH:MM)' })
        .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS'),
      services: z
        .array(z.string(), {
          required_error: 'services array is required',
        })
        .min(1, 'At least one service must be selected'),
      otherServiceText: z.string().optional().nullable(),
      medications: z.array(z.string()).optional().default([]),
      note: z.string().optional().nullable().default(''),
      price: z.number().optional().default(0),
    })
    .superRefine((data, ctx) => {
      if (data.services.includes('injection')) {
        if (!data.medications || data.medications.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "รายการยา (medications) จำเป็นต้องระบุเมื่อเลือกบริการฉีดยา ('injection')",
            path: ['medications'],
          });
        }
      }
    }),
});

export const updateServiceStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid service ID format'),
  }),
  body: z.object({
    status: z.enum(['upcoming', 'completed', 'cancelled'], {
      required_error: "status is required ('upcoming', 'completed', 'cancelled')",
    }),
  }),
});

export const serviceIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid service ID format'),
  }),
});

export const getServicesQuerySchema = z.object({
  query: z
    .object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      status: z.enum(['all', 'upcoming', 'completed', 'cancelled']).optional(),
      customerId: z.string().min(1).optional(),
    })
    .optional(),
});
