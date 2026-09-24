export interface StorageProvider {
  /**
   * Uploads an audio binary buffer to the storage system under the specified key.
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;

  /**
   * Deletes the audio file associated with the specified key from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Generates a secure, short-lived signed playback URL for the given key.
   * Default expiration: 300 seconds (5 minutes).
   */
  getSignedPlaybackUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Verifies whether an object exists in storage.
   */
  exists(key: string): Promise<boolean>;
}
