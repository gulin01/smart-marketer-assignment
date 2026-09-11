import { vi } from "vitest";

/**
 * Route handlers call `cookies()` / `headers()` from `next/headers`, which only
 * work inside a Next request context. The suite swaps them for an in-memory jar
 * so handlers can be invoked directly as plain functions.
 */
export interface FakeCookie {
  name: string;
  value: string;
}

class CookieJar {
  private store = new Map<string, string>();

  get(name: string): FakeCookie | undefined {
    const value = this.store.get(name);
    return value === undefined ? undefined : { name, value };
  }
  set(name: string | { name: string; value: string }, value?: string) {
    if (typeof name === "object") this.store.set(name.name, name.value);
    else this.store.set(name, value ?? "");
  }
  delete(name: string) {
    this.store.delete(name);
  }
  has(name: string) {
    return this.store.has(name);
  }
  clear() {
    this.store.clear();
  }
}

export const cookieJar = new CookieJar();
export const headerStore = new Headers();

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar,
  headers: async () => headerStore,
}));
