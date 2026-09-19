import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Customer name is required' }).min(1, 'Customer name cannot be empty'),
    phone: z.string().optional().nullable().default(''),
    note: z.string().optional().nullable().default(''),
    address: z.string().optional().nullable().default(''),
    avatarColor: z.string().optional().nullable().default('bg-emerald-500'),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid customer ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Customer name cannot be empty').optional(),
    phone: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    avatarColor: z.string().optional().nullable(),
  }),
});

export const customerIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid customer ID format'),
  }),
});

export const getCustomersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    note: z.string().optional(),
  }).optional(),
});
