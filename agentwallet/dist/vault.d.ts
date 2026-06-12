/**
 * @agentwallet/core — Vault implementation
 * Encrypted wallet storage with AES-256-GCM
 */
import type { WalletEntry, WalletInfo, VaultConfig, ChainType } from "./types.js";
/**
 * Default vault configuration from environment variables.
 */
export declare function defaultVaultConfig(): VaultConfig;
/**
 * Vault manages encrypted wallet storage.
 */
export declare class Vault {
    private wallets;
    private masterKey;
    private storePath;
    private initialized;
    private constructor();
    /**
     * Create or load a wallet vault.
     */
    static create(config?: VaultConfig): Promise<Vault>;
    /**
     * Add a new wallet to the vault.
     */
    addWallet(id: string | undefined, label: string, chainType: ChainType, chainId: number, address: string, privateKey: Uint8Array): Promise<WalletEntry>;
    /**
     * Get a wallet entry by ID (without private key).
     */
    getWallet(id: string): WalletInfo | undefined;
    /**
     * Get all wallet entries (without private keys).
     */
    listWallets(): WalletInfo[];
    /**
     * Decrypt and return the private key for a wallet.
     */
    getPrivateKey(id: string): Uint8Array;
    /**
     * Pause a wallet (freeze operations).
     */
    pauseWallet(id: string): Promise<void>;
    /**
     * Unpause a wallet.
     */
    unpauseWallet(id: string): Promise<void>;
    /**
     * Delete a wallet from the vault.
     */
    deleteWallet(id: string): Promise<void>;
    /**
     * Export vault data as encrypted JSON (for backup/transfer).
     */
    exportVault(): Promise<string>;
    /**
     * Import vault data from encrypted JSON.
     */
    importVault(encryptedData: string): Promise<number>;
    private get vaultFile();
    private save;
    private load;
    private toWalletInfo;
}
//# sourceMappingURL=vault.d.ts.map