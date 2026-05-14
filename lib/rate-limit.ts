// lib/rate-limit.ts
import { getDB } from './db';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  request: Request,
  identifier: string, // e.g. "login:username" or "search:ip"
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const db = getDB();
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = `ratelimit:${identifier}:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  // Clean old entries
  await db.prepare(`
    DELETE FROM rate_limits 
    WHERE key = ? AND expires_at < ?
  `).bind(key, now).run();

  const result = await db.prepare(`
    SELECT count, expires_at FROM rate_limits 
    WHERE key = ?
  `).bind(key).first() as { count: number; expires_at: number } | null;

  if (!result) {
    // First request
    await db.prepare(`
      INSERT INTO rate_limits (key, count, expires_at)
      VALUES (?, 1, ?)
    `).bind(key, now + options.windowSeconds).run();

    return { success: true, remaining: options.limit - 1, resetIn: options.windowSeconds };
  }

  if (result.count >= options.limit) {
    return { 
      success: false, 
      remaining: 0, 
      resetIn: result.expires_at - now 
    };
  }

  // Increment
  await db.prepare(`
    UPDATE rate_limits 
    SET count = count + 1 
    WHERE key = ?
  `).bind(key).run();

  return { 
    success: true, 
    remaining: options.limit - result.count - 1, 
    resetIn: result.expires_at - now 
  };
}
