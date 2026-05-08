"use client";

import { useCallback, useEffect, useState } from "react";

import { readHistoryStore, writeHistoryStore } from "@/lib/history-store";
import type { HistoryItem } from "@/lib/types";

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    readHistoryStore()
      .then((stored) => {
        if (!cancelled) setItems(stored);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: HistoryItem[]) => {
    void writeHistoryStore(next);
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
