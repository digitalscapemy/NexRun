import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  nationality: z.string().trim().min(2, "Nationality is required").default("Malaysian"),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const updateOrganizationDetailsSchema = z.object({
  contactPerson: z.string().trim().min(2, "Contact person is required"),
  phone: z.string().trim().min(8, "Valid phone number is required"),
  address: z.string().trim().min(5, "Valid business address is required"),
  bankName: z.string().trim().min(2, "Bank name is required"),
  bankAccountNo: z.string().trim().min(5, "Bank account number is required"),
  bankAccountName: z.string().trim().min(2, "Bank account name is required"),
});

export type UpdateOrganizationDetailsInput = z.infer<typeof updateOrganizationDetailsSchema>;
