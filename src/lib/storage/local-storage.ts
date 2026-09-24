import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider } from './storage.interface';

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'local');
const SIGNING_SECRET = process.env.SESSION_SECRET || 'our-space-local-storage-secret-key-default';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir = LOCAL_STORAGE_DIR) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getSafeFilePath(key: string): string {
    // Prevent path traversal
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(this.baseDir, safeKey);

    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error('Access denied: path traversal detected');
    }

    return fullPath;
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = this.getSafeFilePath(key);
    const parentDir = path.dirname(filePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getSafeFilePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error('Local storage delete error:', err);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getSafeFilePath(key);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async getSignedPlaybackUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const hmac = crypto.createHmac('sha256', SIGNING_SECRET);
    hmac.update(`${key}:${expires}`);
    const signature = hmac.digest('hex');

    const params = new URLSearchParams({
      key,
      expires: expires.toString(),
      sig: signature,
    });

    return `/api/voice/stream?${params.toString()}`;
  }

  /**
   * Verifies the cryptographic HMAC signature of a local signed URL.
   */
  static verifySignedToken(key: string, expires: number, signature: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', SIGNING_SECRET);
      hmac.update(`${key}:${expires}`);
      const expectedSignature = hmac.digest('hex');

      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expectedSignature, 'hex');

      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Reads raw file buffer (used by the secure streaming endpoint).
   */
  async readStream(key: string): Promise<{ buffer: Buffer; size: number } | null> {
    const filePath = this.getSafeFilePath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = await fs.promises.stat(filePath);
    const buffer = await fs.promises.readFile(filePath);
    return { buffer, size: stat.size };
  }
}
