/**
 * @agentwallet/core — Keypair generation for Solana and EVM
 */
import type { KeypairResult } from "./types.js";
/**
 * Generate a Solana Ed25519 keypair using tweetnacl.
 * Returns the full 64-byte secret key, 32-byte public key, and base58 address.
 */
export declare function generateSolanaKeypair(): Promise<KeypairResult>;
/**
 * Import a Solana keypair from a base58-encoded private key.
 */
export declare function importSolanaKeypair(base58Key: string): Promise<KeypairResult>;
/**
 * Import a Solana keypair from a Uint8Array (e.g., JSON array format from solana-keygen).
 */
export declare function importSolanaKeypairFromBytes(secretBytes: Uint8Array): Promise<KeypairResult>;
/**
 * Generate an EVM (Ethereum/secp256k1) keypair using ethers.js.
 * Returns the private key bytes, hex address, and compressed public key.
 */
export declare function generateEVMKeypair(): Promise<KeypairResult>;
/**
 * Import an EVM keypair from a hex private key.
 */
export declare function importEVMKeypair(privateKeyHex: string): Promise<KeypairResult>;
//# sourceMappingURL=keygen.d.ts.map