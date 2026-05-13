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
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from "vue";

import AnnouncementCard from "@/components/AnnouncementCard.vue";
import Composer from "@/components/Composer.vue";
import HistoryList from "@/components/HistoryList.vue";
import HistoryToolbar from "@/components/HistoryToolbar.vue";
import { useHistory } from "@/composables/use-history";
import { connectGenerateTask } from "@/api";
import type {
  GenerateRequest,
  GenerateTaskMessage,
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
const sockets = new Map<string, WebSocket>();

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
  connectTask(taskId, request);
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function updateGeneratingTask(taskId: string, message: GenerateTaskMessage) {
  generating.value = generating.value.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: message.status,
          total: message.total,
          completed: message.completed,
          active: message.active,
          queuedAt: message.queuedAt,
          generationStartedAt: message.generationStartedAt,
        }
      : task,
  );
}

function finishTask(taskId: string, item: HistoryItem) {
  generating.value = generating.value.filter((task) => task.id !== taskId);
  sockets.get(taskId)?.close();
  sockets.delete(taskId);
  add(item);
}

function connectTask(taskId: string, request: GenerateRequest) {
  sockets.get(taskId)?.close();
  const socket = connectGenerateTask(taskId, {
    onMessage: (message) => {
      updateGeneratingTask(taskId, message);
      if (message.status === "completed" && "images" in message) {
        finishTask(taskId, {
          id: makeId(),
          createdAt: Date.now(),
          prompt: request.prompt,
          size: request.size,
          quality: request.quality,
          format: request.format,
          n: request.n,
          images: message.images.map((image) => image.src),
          referenceImages: request.referenceImages,
          favorite: false,
          durationMs:
            message.generationStartedAt && message.completedAt
              ? message.completedAt - message.generationStartedAt
              : undefined,
        });
      }

      if (message.status === "failed") {
        finishTask(taskId, {
          id: makeId(),
          createdAt: Date.now(),
          prompt: request.prompt,
          size: request.size,
          quality: request.quality,
          format: request.format,
          n: request.n,
          images: [],
          referenceImages: request.referenceImages,
          favorite: false,
          status: "failed",
          errorMessage: "error" in message ? message.error : "生成失败",
          durationMs:
            message.generationStartedAt && message.failedAt
              ? message.failedAt - message.generationStartedAt
              : undefined,
        });
      }
    },
    onError: () => {
      finishTask(taskId, {
        id: makeId(),
        createdAt: Date.now(),
        prompt: request.prompt,
        size: request.size,
        quality: request.quality,
        format: request.format,
        n: request.n,
        images: [],
        referenceImages: request.referenceImages,
        favorite: false,
        status: "failed",
        errorMessage: "WebSocket 连接失败",
      });
    },
    onClose: () => {
      sockets.delete(taskId);
    },
  });
  sockets.set(taskId, socket);
}

onBeforeUnmount(() => {
  for (const socket of sockets.values()) {
    socket.close();
  }
  sockets.clear();
});
</script>
