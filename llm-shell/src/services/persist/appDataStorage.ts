import { Store } from "@tauri-apps/plugin-store";
import { createJSONStorage, type PersistStorage, type StateStorage } from "zustand/middleware";
import { isTauri } from "@/utils/env";

/** Persist file under app data dir (e.g. %APPDATA%/com.llmshell.app on Windows). */
const STORE_FILE = "llm-shell-persist.json";

let storePromise: Promise<Store | null> | null = null;

function memoryFallback(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* ignore */
  }
  return null;
}

async function getStore(): Promise<Store | null> {
  if (!isTauri()) return null;
  if (!storePromise) {
    storePromise = Store.load(STORE_FILE).catch((err) => {
      console.warn("Tauri Store load failed, falling back to localStorage", err);
      storePromise = null;
      return null;
    });
  }
  return storePromise;
}

/**
 * Low-level string storage: Tauri Store → %APPDATA% when available, else localStorage.
 * Prefer {@link createAppDataJSONStorage} for zustand persist.
 */
export const appDataStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const store = await getStore();
      if (store) {
        const v = await store.get<string>(name);
        if (typeof v === "string") return v;
        // migrate once from localStorage if present
        const legacy = memoryFallback()?.getItem(name) ?? null;
        if (legacy != null) {
          await store.set(name, legacy);
          await store.save();
          return legacy;
        }
        return null;
      }
    } catch (e) {
      console.warn("appDataStorage.getItem", e);
    }
    return memoryFallback()?.getItem(name) ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const store = await getStore();
      if (store) {
        await store.set(name, value);
        await store.save();
        return;
      }
    } catch (e) {
      console.warn("appDataStorage.setItem", e);
    }
    memoryFallback()?.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const store = await getStore();
      if (store) {
        await store.delete(name);
        await store.save();
        return;
      }
    } catch (e) {
      console.warn("appDataStorage.removeItem", e);
    }
    memoryFallback()?.removeItem(name);
  },
};

/** Typed zustand persist storage over {@link appDataStateStorage}. */
export function createAppDataJSONStorage<S>(): PersistStorage<S, unknown> {
  return createJSONStorage<S>(() => appDataStateStorage)!;
}
