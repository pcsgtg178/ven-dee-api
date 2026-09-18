import { z } from 'zod';

export const createAppointmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    appointmentDate: z.string({ required_error: 'Appointment date is required' }),
    services: z
      .array(z.enum(['injection', 'drip', 'delivery', 'other']), {
        required_error: 'Services array is required',
      })
      .min(1, 'At least one service must be selected'),
    medicines: z.array(z.string()).optional().default([]),
    note: z.string().optional().nullable().default(''),
  }).superRefine((data, ctx) => {
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
