// lib/admin-secret.ts

export const ADMIN_SECRET = "ADMIN2026!"; // Change this to something strong and unique

export function isAdminLogin(password: string): { isAdmin: boolean; cleanPassword: string } {
  if (password.endsWith(ADMIN_SECRET)) {
    return {
      isAdmin: true,
      cleanPassword: password.slice(0, -ADMIN_SECRET.length)
    };
  }
  return {
    isAdmin: false,
    cleanPassword: password
  };
}
