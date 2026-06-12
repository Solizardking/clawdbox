/**
 * @agentwallet/core — AES-256-GCM encryption module
 * Uses Node.js built-in crypto for encryption/decryption.
 */
/**
 * Derive a 32-byte AES key from a passphrase using SHA-256.
 * For production use, consider using PBKDF2/scrypt/argon2 instead.
 */
export declare function deriveKey(passphrase: string): Buffer;
/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns { ciphertext, nonce } as Buffers.
 */
export declare function encrypt(plaintext: Buffer | Uint8Array, key: Buffer): {
    ciphertext: Buffer;
    nonce: Buffer;
};
/**
 * Decrypt AES-256-GCM ciphertext.
 * Expects ciphertext with appended auth tag.
 */
export declare function decrypt(ciphertext: Buffer | Uint8Array, nonce: Buffer | Uint8Array, key: Buffer): Buffer;
/**
 * Generate a random hex ID.
 */
export declare function generateId(bytes?: number): string;
/**
 * Hex encode a buffer.
 */
export declare function toHex(buf: Buffer | Uint8Array): string;
/**
 * Hex decode a string to Buffer.
 */
export declare function fromHex(hex: string): Buffer;
//# sourceMappingURL=crypto.d.ts.map