import "server-only";
import { createMemoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

export type { Store } from "./types";

export function isDemoMode(): boolean {
  return !process.env.SUPABASE_URL;
}

const g = globalThis as unknown as { __b119Store?: Store };

/** 요청마다 같은 저장소를 쓴다. 데모 모드의 메모리 데이터가 유지되도록 전역에 둔다. */
export function getStore(): Store {
  if (!g.__b119Store) g.__b119Store = isDemoMode() ? createMemoryStore() : createSupabaseStore();
  return g.__b119Store;
}
