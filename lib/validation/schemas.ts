import { z } from "zod";

// Pakistan Phone Number Regex: +923XXXXXXXXX, 03XXXXXXXXX, or 923XXXXXXXXX
export const PK_PHONE_REGEX = /^(\+92|92|0)?3\d{2}[- ]?\d{7}$/;

// Pakistan CNIC Regex: 42101-1234567-1
export const PK_CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

/**
 * Common Field Schemas
 */
export const PhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => PK_PHONE_REGEX.test(val.replace(/\s+/g, "")), {
    message: "Invalid phone number format. Use format +92 3XX XXXXXXX or 03XXXXXXXXX.",
  });

export const CnicSchema = z
  .string()
  .min(1, "CNIC is required")
  .refine((val) => PK_CNIC_REGEX.test(val.trim()), {
    message: "Invalid CNIC format. Standard Pakistan format is XXXXX-XXXXXXX-X (13 digits).",
  });

export const PositiveQuantitySchema = z
  .number({ message: "Quantity must be a valid number" })
  .int("Quantity must be a whole integer")
  .positive("Quantity must be greater than zero");

export const PositivePriceSchema = z
  .number({ message: "Price must be a number" })
  .nonnegative("Price cannot be negative");

export const TaxRateSchema = z
  .number({ message: "Tax rate must be a number" })
  .min(0, "Tax rate cannot be negative")
  .max(100, "Tax rate cannot exceed 100%");

/**
 * Client Registration / Edit Schema
 */
export const ClientFormSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  email: z.string().email("Please enter a valid business email address"),
  phone: PhoneSchema,
  country: z.string().min(2, "Country is required"),
  city: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
});

/**
 * Order Creation Schema
 */
export const OrderFormSchema = z.object({
  title: z.string().min(3, "Order title / style description is required"),
  clientId: z.string().min(1, "Please select a valid buyer/client"),
  poNumber: z.string().min(2, "Buyer PO number is required"),
  totalQuantity: PositiveQuantitySchema,
  unitPrice: PositivePriceSchema,
  currency: z.enum(["USD", "EUR", "GBP", "PKR", "AED"]),
  deliveryDate: z.string().min(1, "Delivery commitment date is required"),
  notes: z.string().optional(),
});

/**
 * Commercial Invoice Calculation Schema
 */
export const InvoiceCalculationSchema = z.object({
  subtotal: PositivePriceSchema,
  taxRate: TaxRateSchema,
  shippingHandling: PositivePriceSchema.default(0),
  discountAmount: PositivePriceSchema.default(0),
  paidAmount: PositivePriceSchema.default(0),
}).transform((data) => {
  const taxAmount = (data.subtotal * data.taxRate) / 100;
  const totalAmount = data.subtotal + taxAmount + data.shippingHandling - data.discountAmount;
  const balanceDue = Math.max(0, totalAmount - data.paidAmount);
  return {
    ...data,
    taxAmount,
    totalAmount,
    balanceDue,
  };
});

/**
 * Helper to validate form data with Zod and return a simple field error map
 */
export function validateWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  if (result.error && result.error.issues) {
    for (const issue of result.error.issues) {
      const fieldPath = issue.path.join(".");
      if (fieldPath && !errors[fieldPath]) {
        errors[fieldPath] = issue.message;
      }
    }
  }

  return { success: false, errors };
}
