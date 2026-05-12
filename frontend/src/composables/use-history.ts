import { onBeforeUnmount, onMounted, ref } from "vue";

import { readHistoryStore, writeHistoryStore } from "@/lib/history-store";
import type { HistoryItem } from "@/lib/types";

export function useHistory() {
  const items = ref<HistoryItem[]>([]);
  const hydrated = ref(false);
  let cancelled = false;

  onMounted(() => {
    readHistoryStore()
      .then((stored) => {
        if (!cancelled) items.value = stored;
      })
      .finally(() => {
        if (!cancelled) hydrated.value = true;
      });
  });

  onBeforeUnmount(() => {
    cancelled = true;
  });

  function persist(next: HistoryItem[]) {
    void writeHistoryStore(next);
    items.value = next;
  }

  function add(item: HistoryItem) {
    persist([item, ...items.value]);
  }

  function remove(id: string) {
    persist(items.value.filter((it) => it.id !== id));
  }

  function update(id: string, patch: Partial<HistoryItem>) {
    persist(items.value.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function toggleFavorite(id: string) {
    persist(
      items.value.map((it) =>
        it.id === id ? { ...it, favorite: !it.favorite } : it,
      ),
    );
  }

  function clear() {
    persist([]);
  }

  return { items, hydrated, add, remove, update, toggleFavorite, clear };
}
