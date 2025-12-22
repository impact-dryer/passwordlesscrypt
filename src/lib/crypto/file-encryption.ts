/**
 * File encryption utilities for large file handling.
 * Uses AES-GCM encryption with the existing DEK.
 *
 * For simplicity and security, we encrypt the entire file as a single blob
 * rather than chunking. AES-GCM can handle files up to 64GB safely.
 * Memory usage is managed by the browser's ArrayBuffer implementation.
 */

import { FILE_CONSTANTS } from './constants';
import { encryptData, decryptData } from './encryption';

/**
 * Metadata stored alongside encrypted file data.
 */
export interface EncryptedFileMetadata {
  /** Original filename */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Encryption version for future migrations */
  version: number;
}

/**
 * Result of file encryption operation.
 */
export interface EncryptedFileResult {
  /** The encrypted file data */
  encryptedData: Uint8Array;
  /** Metadata about the file */
  metadata: EncryptedFileMetadata;
}

/**
 * Validates file size against maximum allowed.
 *
 * @param size - File size in bytes
 * @throws Error if file exceeds maximum size
 */
export function validateFileSize(size: number): void {
  if (size > FILE_CONSTANTS.MAX_FILE_SIZE) {
    const maxMB = Math.round(FILE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024));
    throw new Error(`File size exceeds maximum allowed (${String(maxMB)}MB)`);
  }
}

/**
 * Reads a File object into a Uint8Array.
 *
 * @param file - The File to read
 * @returns The file contents as Uint8Array
 */
export async function readFileAsArrayBuffer(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Encrypts a file using AES-GCM.
 *
 * @param dek - Data Encryption Key
 * @param file - The file to encrypt
 * @returns Encrypted file data and metadata
 * @throws Error if file exceeds size limit
 */
export async function encryptFile(dek: CryptoKey, file: File): Promise<EncryptedFileResult> {
  // Validate file size
  validateFileSize(file.size);

  // Read file contents
  const fileData = await readFileAsArrayBuffer(file);

  // Encrypt the file data
  const encryptedData = await encryptData(dek, fileData);

  // Create metadata
  const metadata: EncryptedFileMetadata = {
    fileName: file.name,
    mimeType: file.type !== '' ? file.type : 'application/octet-stream',
    originalSize: file.size,
    version: 1,
  };

  return { encryptedData, metadata };
}

/**
 * Decrypts an encrypted file blob.
 *
 * @param dek - Data Encryption Key
 * @param encryptedData - The encrypted file data
 * @param metadata - File metadata (fileName, mimeType)
 * @returns Decrypted file as a Blob
 * @throws Error if decryption fails
 */
export async function decryptFile(
  dek: CryptoKey,
  encryptedData: Uint8Array,
  metadata: { fileName: string; mimeType: string }
): Promise<File> {
  // Decrypt the file data
  const decryptedData = await decryptData(dek, encryptedData);

  // Copy data to a new ArrayBuffer to ensure proper type compatibility
  const buffer = new ArrayBuffer(decryptedData.byteLength);
  new Uint8Array(buffer).set(decryptedData);

  // Create a File object with the original name and type
  return new File([buffer], metadata.fileName, {
    type: metadata.mimeType,
  });
}

/**
 * Creates a download URL for a decrypted file.
 * Remember to revoke the URL after use with URL.revokeObjectURL().
 *
 * @param file - The decrypted file
 * @returns Object URL for downloading
 */
export function createFileDownloadUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Triggers a file download in the browser.
 *
 * @param file - The file to download
 */
export function downloadFile(file: File): void {
  const url = createFileDownloadUrl(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a file size in bytes to a human-readable string.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  let unit: string;
  switch (i) {
    case 0:
      unit = 'B';
      break;
    case 1:
      unit = 'KB';
      break;
    case 2:
      unit = 'MB';
      break;
    default:
      unit = 'GB';
      break;
  }

  return `${size.toFixed(i > 0 ? 1 : 0)} ${unit}`;
}

/**
 * Gets a file extension from a filename.
 *
 * @param fileName - The filename
 * @returns The extension (without dot) or empty string
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return '';
  }
  const extension = fileName.slice(lastDot + 1);
  return extension.toLowerCase();
}

/**
 * Determines if a file type can be previewed in the browser.
 *
 * @param mimeType - The MIME type
 * @returns True if the file can be previewed
 */
export function isPreviewable(mimeType: string): boolean {
  const previewableTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
  ];
  return previewableTypes.includes(mimeType);
}
