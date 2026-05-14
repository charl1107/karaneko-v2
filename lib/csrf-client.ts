"use client";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

function createClientToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

export function getCsrfToken() {
  let token = readCookie(CSRF_COOKIE_NAME);
  if (!token) {
    token = createClientToken();
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; Path=/; Max-Age=604800; SameSite=Lax; Secure`;
  }
  return token;
}

export function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set(CSRF_HEADER_NAME, getCsrfToken());
  return fetch(input, { ...init, headers });
}
