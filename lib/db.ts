// Cloudflare D1 database access
// D1 is injected via the binding defined in wrangler.toml

import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest } from "next/server";

export interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<D1ExecResult>;
  batch: (statements: D1PreparedStatement[]) => Promise<D1Result[]>;
}

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>(col?: string) => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  run: () => Promise<D1Result>;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export function isMissingDBBinding(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "";

  return message.includes("D1 database binding") && message.includes("DB");
}

export function getDB(request?: NextRequest): D1Database {
  // 1. Cloudflare Pages / next-on-pages request context
  const requestContext = getOptionalRequestContext();
  if (requestContext?.env && "DB" in requestContext.env) {
    return requestContext.env.DB as D1Database;
  }

  // 2. Cloudflare Workers runtime (production)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfEnv = (globalThis as any).__env__;
  if (cfEnv?.DB) return cfEnv.DB as D1Database;

  // 3. Cloudflare Pages with next-on-pages (production/preview)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagesCfEnv = (request as any)?.__cloudflare__?.env;
  if (pagesCfEnv?.DB) return pagesCfEnv.DB as D1Database;

  // 4. Wrangler local dev (npm run dev:local)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalDB = (globalThis as any).DB;
  if (globalDB) return globalDB as D1Database;

  // 4. Not found — helpful error message
  throw new Error(
    "D1 database binding 'DB' not found.\n" +
    "For local dev, run: npm run dev:local\n" +
    "For production, make sure wrangler.toml has the correct database_id."
  );
}
