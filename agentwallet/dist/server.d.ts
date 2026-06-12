/**
 * @agentwallet/core — HTTP API Server
 * Express-based REST API for vault operations
 */
import express, { type Request, type Response, type NextFunction } from "express";
import type { Vault } from "./vault.js";
import type { ServerConfig } from "./types.js";
/**
 * Default server configuration.
 */
export declare function defaultServerConfig(): ServerConfig;
/**
 * Create an Express router for the vault API.
 */
export declare function createVaultRouter(vault: Vault): express.Router;
/**
 * Bearer token authentication middleware.
 */
export declare function authMiddleware(apiToken: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * CORS middleware.
 */
export declare function corsMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Start the vault HTTP server.
 */
export declare function startServer(vault: Vault, config?: ServerConfig): Promise<express.Application>;
//# sourceMappingURL=server.d.ts.map