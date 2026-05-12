<template>
  <div class="flex items-center gap-2">
    <el-button
      circle
      :type="favoritesOnly ? 'primary' : ''"
      :plain="!favoritesOnly"
      title="只看收藏"
      @click="$emit('favoritesToggle')"
    >
      <el-icon>
        <Star :class="favoritesOnly ? 'fill-current' : ''" />
      </el-icon>
      <span class="sr-only">收藏过滤</span>
    </el-button>

    <div class="shrink-0" style="width: 120px">
      <el-select
        :model-value="filter"
        class="w-full"
        size="small"
        placeholder="全部状态"
        @update:model-value="$emit('update:filter', $event as HistoryFilter)"
      >
        <el-option label="全部状态" value="all" />
        <el-option label="已收藏" value="favorites" />
      </el-select>
    </div>

    <div class="relative min-w-0 flex-1 basis-0">
      <el-input
        :model-value="query"
        class="history-search w-full"
        style="width: 100%"
        placeholder="搜索提示词、参数..."
        @update:model-value="$emit('update:query', $event)"
      >
        <template #prefix>
          <el-icon class="text-muted-foreground">
            <Search />
          </el-icon>
        </template>
      </el-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Star } from "@element-plus/icons-vue";

import type { HistoryFilter } from "@/lib/types";

defineProps<{
  filter: HistoryFilter;
  query: string;
  favoritesOnly: boolean;
}>();

defineEmits<{
  "update:filter": [value: HistoryFilter];
  "update:query": [value: string];
  favoritesToggle: [];
}>();
</script>
