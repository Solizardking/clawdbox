/**
 * @agentwallet/core — Cloudflare Workers Deployment
 * Deploy vault server as a Cloudflare Worker for edge execution
 */
import type { CloudflareConfig, SandboxInstance } from "../types.js";
/**
 * Cloudflare Workers deployment manager.
 */
export declare class CloudflareDeployer {
    private config;
    constructor(config: CloudflareConfig);
    /**
     * Generate the Worker source code.
     */
    private generateWorkerCode;
    /**
     * Generate wrangler.toml configuration.
     */
    private generateWranglerToml;
    /**
     * Deploy to Cloudflare Workers using wrangler.
     */
    deploy(): Promise<SandboxInstance>;
    /**
     * Get logs from the deployed worker.
     */
    logs(): Promise<string>;
}
/**
 * Deploy to Cloudflare Workers (convenience function).
 */
export declare function deployToCloudflare(config: CloudflareConfig): Promise<SandboxInstance>;
//# sourceMappingURL=cloudflare.d.ts.map