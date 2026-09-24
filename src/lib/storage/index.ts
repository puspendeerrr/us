import { StorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local-storage';
import { S3StorageProvider } from './s3-storage';

export * from './storage.interface';
export * from './local-storage';
export * from './s3-storage';

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!providerInstance) {
    const providerType = process.env.STORAGE_PROVIDER?.toLowerCase() || 'local';

    if (providerType === 's3') {
      providerInstance = new S3StorageProvider();
    } else {
      providerInstance = new LocalStorageProvider();
    }
  }

  return providerInstance;
}
