import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.interface';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'our-space-media';

    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Force path style is useful for R2 and local S3 emulators (e.g. MinIO)
      forcePathStyle: !endpoint?.includes('amazonaws.com'),
    });
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
    } catch (err) {
      console.error('S3 storage delete error:', err);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedPlaybackUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
