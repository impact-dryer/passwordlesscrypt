/**
 * Zod schemas for runtime validation of vault data.
 * This ensures data integrity after decryption and protects against
 * corrupted or tampered data.
 */

import { z } from 'zod';

/**
 * Schema for a single vault item.
 * Note: We use permissive validation to handle existing data gracefully.
 */
export const VaultItemSchema = z.object({
  id: z.string().min(1), // Allow any non-empty string ID
  type: z.enum(['note', 'password', 'secret']),
  title: z.string(), // Allow empty titles
  content: z.string(),
  url: z.string().optional(), // Don't require valid URL format
  username: z.string().optional(),
  createdAt: z.number(),
  modifiedAt: z.number(),
});

/**
 * Schema for the full vault data structure.
 */
export const VaultDataSchema = z.object({
  version: z.number(),
  items: z.array(VaultItemSchema),
});

/**
 * Schema for vault metadata.
 */
export const VaultMetadataSchema = z.object({
  version: z.number().int().min(1),
  createdAt: z.number().int().positive(),
  modifiedAt: z.number().int().positive(),
  itemCount: z.number().int().min(0),
});

/**
 * Validates vault data after decryption.
 * Throws ZodError if validation fails.
 */
export function validateVaultData(data: unknown): z.infer<typeof VaultDataSchema> {
  const result = VaultDataSchema.safeParse(data);
  if (!result.success) {
    // Log validation errors for debugging
    console.error('Vault validation errors:', result.error.issues);
    throw result.error;
  }
  return result.data;
}

/**
 * Safely validates vault data, returning null on failure.
 */
export function safeValidateVaultData(data: unknown): z.infer<typeof VaultDataSchema> | null {
  const result = VaultDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

// Export inferred types
export type ValidatedVaultItem = z.infer<typeof VaultItemSchema>;
export type ValidatedVaultData = z.infer<typeof VaultDataSchema>;
export type ValidatedVaultMetadata = z.infer<typeof VaultMetadataSchema>;




