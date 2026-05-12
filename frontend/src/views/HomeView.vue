<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-325 flex-col gap-4 px-4 pb-80 pt-6 sm:pb-68 lg:px-6">
    <AnnouncementCard />
    <HistoryToolbar
      v-model:filter="filter"
      v-model:query="query"
      :favorites-only="favoritesOnly"
      @favorites-toggle="favoritesOnly = !favoritesOnly"
    />
    <HistoryList
      :items="items"
      :generating="generating"
      :filter="filter"
      :query="query"
      :favorites-only="favoritesOnly"
      @favorite="toggleFavorite"
      @regenerate="loadIntoComposer"
      @edit="loadIntoComposer"
      @delete="remove"
    />
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-background via-background/95 to-transparent px-4 pb-3 pt-8 lg:px-6"
    >
      <div class="pointer-events-auto mx-auto w-full max-w-[865px]">
        <Composer
          :initial="composerInitial"
          :reset-key="composerKey"
          @start="handleStart"
          @success="handleSuccess"
          @error="handleError"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";

import AnnouncementCard from "@/components/AnnouncementCard.vue";
import Composer from "@/components/Composer.vue";
import HistoryList from "@/components/HistoryList.vue";
import HistoryToolbar from "@/components/HistoryToolbar.vue";
import { useHistory } from "@/composables/use-history";
import type {
  GenerateRequest,
  GeneratingTask,
  HistoryFilter,
  HistoryItem,
} from "@/lib/types";

type ComposerInitial = Partial<Omit<GenerateRequest, "prompt">> & {
  prompt?: string;
};

const { items, add, remove, toggleFavorite } = useHistory();
const filter = ref<HistoryFilter>("all");
const query = ref("");
const favoritesOnly = ref(false);
const composerInitial = shallowRef<ComposerInitial | undefined>(undefined);
const composerKey = ref(0);
const generating = ref<GeneratingTask[]>([]);

function loadIntoComposer(item: HistoryItem) {
  composerInitial.value = {
    prompt: item.prompt,
    size: item.size,
    quality: item.quality,
    format: item.format,
    n: item.n,
    referenceImages: item.referenceImages
      ? item.referenceImages.map((image) => ({ ...image }))
      : undefined,
  };
  composerKey.value += 1;
}

function handleStart(taskId: string, request: GenerateRequest) {
  generating.value = [{ id: taskId, request }, ...generating.value];
}

function handleSuccess(taskId: string, item: HistoryItem) {
  generating.value = generating.value.filter((task) => task.id !== taskId);
  add(item);
}

function handleError(taskId: string, item: HistoryItem) {
  generating.value = generating.value.filter((task) => task.id !== taskId);
  add(item);
}
</script>
