import { describe, it, expect } from 'vitest';
import {
  VaultItemSchema,
  VaultDataSchema,
  VaultMetadataSchema,
  validateVaultData,
  safeValidateVaultData,
} from './schemas';

describe('storage/schemas', () => {
  describe('VaultItemSchema', () => {
    const validItem = {
      id: 'test-id-123',
      type: 'password' as const,
      title: 'My Password',
      content: 'secret123',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    it('should validate a valid password item', () => {
      const result = VaultItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should validate a valid note item', () => {
      const item = { ...validItem, type: 'note' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should validate a valid secret item', () => {
      const item = { ...validItem, type: 'secret' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should validate item with optional url', () => {
      const item = { ...validItem, url: 'https://example.com' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should validate item with optional username', () => {
      const item = { ...validItem, username: 'user@example.com' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const item = { ...validItem, type: 'invalid' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const { id, ...item } = validItem;
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should reject empty id', () => {
      const item = { ...validItem, id: '' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should allow empty title', () => {
      const item = { ...validItem, title: '' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should allow empty content', () => {
      const item = { ...validItem, content: '' };
      const result = VaultItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });

  describe('VaultDataSchema', () => {
    const validVault = {
      version: 1,
      items: [
        {
          id: 'item-1',
          type: 'password' as const,
          title: 'Test',
          content: 'secret',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        },
      ],
    };

    it('should validate a valid vault', () => {
      const result = VaultDataSchema.safeParse(validVault);
      expect(result.success).toBe(true);
    });

    it('should validate empty items array', () => {
      const vault = { version: 1, items: [] };
      const result = VaultDataSchema.safeParse(vault);
      expect(result.success).toBe(true);
    });

    it('should validate vault with multiple items', () => {
      const vault = {
        version: 1,
        items: [
          {
            id: 'item-1',
            type: 'password' as const,
            title: 'Password',
            content: 'secret',
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          },
          {
            id: 'item-2',
            type: 'note' as const,
            title: 'Note',
            content: 'text',
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          },
        ],
      };
      const result = VaultDataSchema.safeParse(vault);
      expect(result.success).toBe(true);
    });

    it('should reject missing version', () => {
      const { version, ...vault } = validVault;
      const result = VaultDataSchema.safeParse(vault);
      expect(result.success).toBe(false);
    });

    it('should reject missing items', () => {
      const { items, ...vault } = validVault;
      const result = VaultDataSchema.safeParse(vault);
      expect(result.success).toBe(false);
    });

    it('should reject invalid item in array', () => {
      const vault = {
        version: 1,
        items: [{ invalid: 'item' }],
      };
      const result = VaultDataSchema.safeParse(vault);
      expect(result.success).toBe(false);
    });
  });

  describe('VaultMetadataSchema', () => {
    const validMetadata = {
      version: 1,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      itemCount: 5,
    };

    it('should validate valid metadata', () => {
      const result = VaultMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate zero item count', () => {
      const metadata = { ...validMetadata, itemCount: 0 };
      const result = VaultMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should reject negative item count', () => {
      const metadata = { ...validMetadata, itemCount: -1 };
      const result = VaultMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const { version, ...metadata } = validMetadata;
      const result = VaultMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });
  });

  describe('validateVaultData', () => {
    it('should return validated data for valid input', () => {
      const input = {
        version: 1,
        items: [],
      };
      const result = validateVaultData(input);
      expect(result).toEqual(input);
    });

    it('should throw for invalid input', () => {
      const input = { invalid: 'data' };
      expect(() => validateVaultData(input)).toThrow();
    });

    it('should strip extra properties', () => {
      const input = {
        version: 1,
        items: [],
        extraField: 'should be stripped',
      };
      const result = validateVaultData(input);
      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('safeValidateVaultData', () => {
    it('should return data for valid input', () => {
      const input = {
        version: 1,
        items: [],
      };
      const result = safeValidateVaultData(input);
      expect(result).toEqual(input);
    });

    it('should return null for invalid input', () => {
      const input = { invalid: 'data' };
      const result = safeValidateVaultData(input);
      expect(result).toBeNull();
    });

    it('should not throw for invalid input', () => {
      const input = { invalid: 'data' };
      expect(() => safeValidateVaultData(input)).not.toThrow();
    });
  });
});


