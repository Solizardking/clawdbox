/**
 * @agentwallet/core — E2B Sandbox Deployment
 * Deploy vault server into E2B sandbox for remote agent access
 */
import type { E2BSandboxConfig, SandboxInstance } from "../types.js";
/**
 * E2B sandbox deployment manager.
 */
export declare class E2BDeployer {
    private config;
    constructor(config: E2BSandboxConfig);
    /**
     * Deploy the vault server to an E2B sandbox.
     * Returns the sandbox instance with connection URL.
     */
    deploy(): Promise<SandboxInstance>;
    /**
     * Connect to an existing E2B sandbox.
     */
    connect(sandboxId: string): Promise<SandboxInstance>;
    /**
     * Stop an E2B sandbox.
     */
    stop(sandboxId: string): Promise<void>;
}
/**
 * Deploy to E2B sandbox (convenience function).
 */
export declare function deployToE2B(config: E2BSandboxConfig): Promise<SandboxInstance>;
//# sourceMappingURL=e2b.d.ts.map