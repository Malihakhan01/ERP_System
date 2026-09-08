/**
 * FactoryOS Garment ERP — Centralized REST API Client
 * Connects Next.js Frontend with Laravel 13 Backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  metrics?: Record<string, any>;
  pagination?: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("factoryos_auth_token");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("factoryos_auth_token", token);
  }
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("factoryos_auth_token");
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json().catch(() => ({
      success: false,
      message: `HTTP ${response.status}: Failed to parse JSON response.`,
      data: null as unknown as T,
    }));

    if (!response.ok) {
      const errorMsg = json.message || `API Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return json as ApiResponse<T>;
  } catch (error: any) {
    // If backend is currently offline / in transition, return gracefully
    console.warn(`[API Client Warning] ${endpoint}:`, error.message || error);
    throw error;
  }
}
