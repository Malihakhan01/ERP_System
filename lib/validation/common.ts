// lib/validation/common.ts
// Shared Zod schemas — reusable across forms and server actions

import { z } from "zod";

// ---- Primitives ----
export const idSchema = z.string().uuid("Invalid ID format");
export const emailSchema = z.string().email("Invalid email address");
export const phoneSchema = z
  .string()
  .min(7, "Phone number too short")
  .max(20, "Phone number too long");
export const currencySchema = z
  .number({ message: "Must be a number" })
  .nonnegative("Cannot be negative")
  .multipleOf(0.01, "Max 2 decimal places");

export const dateSchema = z.string().date("Invalid date format (YYYY-MM-DD)");

// ---- Pagination query ----
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

// ---- Search query ----
export const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  ...paginationSchema.shape,
});

// ---- Address ----
export const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default("Pakistan"),
  postal_code: z.string().max(20).optional(),
});

// ---- File upload metadata ----
export const fileMetaSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, "File must be under 10 MB"),
  type: z.string(),
});
