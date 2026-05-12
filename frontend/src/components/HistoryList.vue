<template>
  <div
    v-if="filtered.length === 0 && generating.length === 0"
    class="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
  >
    {{ items.length === 0 ? "还没有生成记录，从下方输入提示词开始吧" : "没有匹配的结果" }}
  </div>

  <div v-else class="flex flex-1 flex-wrap content-start justify-start gap-3">
    <GeneratingCard
      v-for="task in generating"
      :key="task.id"
      :request="task.request"
    />
    <HistoryItemCard
      v-for="item in filtered"
      :key="item.id"
      :item="item"
      @favorite="$emit('favorite', $event)"
      @regenerate="$emit('regenerate', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import GeneratingCard from "@/components/GeneratingCard.vue";
import HistoryItemCard from "@/components/HistoryItemCard.vue";
import type { GeneratingTask, HistoryFilter, HistoryItem } from "@/lib/types";

const props = defineProps<{
  items: HistoryItem[];
  generating: GeneratingTask[];
  filter: HistoryFilter;
  query: string;
  favoritesOnly: boolean;
}>();

defineEmits<{
  favorite: [id: string];
  regenerate: [item: HistoryItem];
  edit: [item: HistoryItem];
  delete: [id: string];
}>();

const filtered = computed(() => {
  const q = props.query.trim().toLowerCase();
  return props.items.filter((it) => {
    if (props.favoritesOnly && !it.favorite) return false;
    if (props.filter === "favorites" && !it.favorite) return false;
    if (q && !it.prompt.toLowerCase().includes(q)) return false;
    return true;
  });
});
</script>
