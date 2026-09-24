import { hash, verify } from '@node-rs/argon2';

// Argon2id configuration with secure memory and iteration settings
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, ARGON2_OPTIONS);
}

export async function verifyPassword(plainText: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plainText);
  } catch {
    return false;
  }
}
