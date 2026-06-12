/**
 * @agentwallet/core — Main entry point
 * Agentic wallet vault for encrypted Solana + EVM keypair management
 */
export type { ChainType, WalletEntry, WalletInfo, VaultConfig, ServerConfig, E2BSandboxConfig, CloudflareConfig, SandboxInstance, KeypairResult, VaultEnvelope, } from "./types.js";
export { Vault, defaultVaultConfig } from "./vault.js";
export { deriveKey, encrypt, decrypt, generateId, toHex, fromHex } from "./crypto.js";
export { generateSolanaKeypair, importSolanaKeypair, importSolanaKeypairFromBytes, generateEVMKeypair, importEVMKeypair, } from "./keygen.js";
export { createVaultRouter, startServer, defaultServerConfig, authMiddleware, corsMiddleware, } from "./server.js";
export { E2BDeployer, deployToE2B, CloudflareDeployer, deployToCloudflare, } from "./deploy/index.js";
//# sourceMappingURL=index.d.ts.map