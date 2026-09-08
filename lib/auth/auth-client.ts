"use client";

import { AuthUser, DEMO_USERS } from "./auth-types";

const SESSION_STORAGE_KEY = "factoryos_auth_user";

export function getClientAuthUser(): AuthUser {
  if (typeof window === "undefined") {
    return DEMO_USERS.admin;
  }
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return DEMO_USERS.admin;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(SESSION_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setClientAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    document.cookie = `factoryos_user=${encodeURIComponent(user.email)}; path=/; max-age=86400; SameSite=Lax`;
    window.dispatchEvent(new Event("factoryos_auth_change"));
  } catch {
    // ignore
  }
}

export function clearClientAuthUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    document.cookie = "factoryos_user=; path=/; max-age=0";
    window.dispatchEvent(new Event("factoryos_auth_change"));
  } catch {
    // ignore
  }
}
