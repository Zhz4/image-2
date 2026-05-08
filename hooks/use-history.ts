"use client";

import { useCallback, useEffect, useState } from "react";

import type { HistoryItem } from "@/lib/types";

const STORAGE_KEY = "image-2:history";

function readStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota or serialization error — silently drop; UI state still consistent
  }
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: HistoryItem[]) => {
    writeStorage(next);
    return next;
  }, []);

  const add = useCallback(
    (item: HistoryItem) => {
      setItems((prev) => persist([item, ...prev]));
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => persist(prev.filter((it) => it.id !== id)));
    },
    [persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<HistoryItem>) => {
      setItems((prev) =>
        persist(prev.map((it) => (it.id === id ? { ...it, ...patch } : it))),
      );
    },
    [persist],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setItems((prev) =>
        persist(
          prev.map((it) =>
            it.id === id ? { ...it, favorite: !it.favorite } : it,
          ),
        ),
      );
    },
    [persist],
  );

  const clear = useCallback(() => {
    setItems(persist([]));
  }, [persist]);

  return { items, hydrated, add, remove, update, toggleFavorite, clear };
}
