/**
 * Tests for file encryption utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateFileSize,
  formatFileSize,
  getFileExtension,
  isPreviewable,
  encryptFile,
  decryptFile,
  readFileAsArrayBuffer,
} from './file-encryption';
import { FILE_CONSTANTS } from './constants';
import { generateDEK } from './envelope';

describe('validateFileSize', () => {
  it('should not throw for files under the limit', () => {
    expect(() => {
      validateFileSize(1024);
    }).not.toThrow();
    expect(() => {
      validateFileSize(FILE_CONSTANTS.MAX_FILE_SIZE);
    }).not.toThrow();
  });

  it('should throw for files over the limit', () => {
    expect(() => {
      validateFileSize(FILE_CONSTANTS.MAX_FILE_SIZE + 1);
    }).toThrow(/File size exceeds maximum/);
  });
});

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatFileSize(100)).toBe('100 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});

describe('getFileExtension', () => {
  it('should return the extension', () => {
    expect(getFileExtension('file.txt')).toBe('txt');
    expect(getFileExtension('document.pdf')).toBe('pdf');
    expect(getFileExtension('image.JPEG')).toBe('jpeg');
  });

  it('should handle multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('file.name.with.dots.txt')).toBe('txt');
  });

  it('should return empty string for no extension', () => {
    expect(getFileExtension('filename')).toBe('');
    expect(getFileExtension('filename.')).toBe('');
  });
});

describe('isPreviewable', () => {
  it('should return true for previewable types', () => {
    expect(isPreviewable('image/jpeg')).toBe(true);
    expect(isPreviewable('image/png')).toBe(true);
    expect(isPreviewable('application/pdf')).toBe(true);
    expect(isPreviewable('text/plain')).toBe(true);
  });

  it('should return false for non-previewable types', () => {
    expect(isPreviewable('application/zip')).toBe(false);
    expect(isPreviewable('application/octet-stream')).toBe(false);
    expect(isPreviewable('video/mp4')).toBe(false);
  });
});

describe('readFileAsArrayBuffer', () => {
  it('should read file contents', async () => {
    const content = 'Hello, World!';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const result = await readFileAsArrayBuffer(file);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(content.length);
  });
});

describe('encryptFile and decryptFile', () => {
  let dek: CryptoKey;

  beforeEach(async () => {
    dek = await generateDEK();
  });

  it('should encrypt and decrypt a file', async () => {
    const content = 'Test file content';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const { encryptedData, metadata } = await encryptFile(dek, file);

    expect(encryptedData).toBeInstanceOf(Uint8Array);
    expect(encryptedData.length).toBeGreaterThan(content.length); // Encrypted + IV + tag
    expect(metadata.fileName).toBe('test.txt');
    expect(metadata.mimeType).toBe('text/plain');
    expect(metadata.originalSize).toBe(content.length);

    const decrypted = await decryptFile(dek, encryptedData, {
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
    });

    expect(decrypted.name).toBe('test.txt');
    expect(decrypted.type).toBe('text/plain');

    // Read decrypted file content using FileReader-like approach
    const decryptedData = await readFileAsArrayBuffer(decrypted);
    const decryptedText = new TextDecoder().decode(decryptedData);
    expect(decryptedText).toBe(content);
  });

  it('should handle binary files', async () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const file = new File([blob], 'binary.bin', { type: 'application/octet-stream' });

    const { encryptedData, metadata } = await encryptFile(dek, file);
    const decrypted = await decryptFile(dek, encryptedData, metadata);

    // Read decrypted file content
    const decryptedBytes = await readFileAsArrayBuffer(decrypted);

    expect(decryptedBytes).toEqual(bytes);
  });

  it('should fail decryption with wrong key', async () => {
    const content = 'Secret content';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const { encryptedData, metadata } = await encryptFile(dek, file);

    const wrongKey = await generateDEK();

    await expect(decryptFile(wrongKey, encryptedData, metadata)).rejects.toThrow();
  });

  it('should use default MIME type for files without type', async () => {
    const content = 'Content';
    const blob = new Blob([content]);
    const file = new File([blob], 'noext', { type: '' });

    const { metadata } = await encryptFile(dek, file);

    expect(metadata.mimeType).toBe('application/octet-stream');
  });
});
