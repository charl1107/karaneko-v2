import { ADMIN_SECRET } from '@/env';

export const ADMIN_SECRET_KEY = ADMIN_SECRET || 'fallback-secret-change-me-in-cloudflare';

export function isAdminLogin(password: string): { isAdmin: boolean; cleanPassword: string } {
  if (!ADMIN_SECRET_KEY || ADMIN_SECRET_KEY.length < 8) {
    return { isAdmin: false, cleanPassword: password };
  }

  if (password.endsWith(ADMIN_SECRET_KEY)) {
    const cleanPassword = password.slice(0, -ADMIN_SECRET_KEY.length);
    return { isAdmin: true, cleanPassword };
  }

  return { isAdmin: false, cleanPassword: password };
}
