<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-325 flex-col gap-4 px-4 pb-80 pt-6 sm:pb-68 lg:px-6">
    <header class="flex items-center justify-between gap-3 rounded-xl border bg-card/80 px-4 py-3 text-card-foreground shadow-sm backdrop-blur">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-sm font-bold text-white">
          S
        </span>
        <div class="min-w-0">
          <p class="font-semibold leading-tight">SmoothAI</p>
          <p class="truncate text-xs text-muted-foreground">{{ user?.email }}</p>
        </div>
      </div>
      <el-button text @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        <span>退出登录</span>
      </el-button>
    </header>
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
          :active-task-count="activeTaskCount"
          :max-active-tasks="maxActiveTasks"
          @start="handleStart"
          @ready="handleReady"
          @fail="handleCreateFailure"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { SwitchButton } from "@element-plus/icons-vue";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";

import AnnouncementCard from "@/components/AnnouncementCard.vue";
import Composer from "@/components/Composer.vue";
import HistoryList from "@/components/HistoryList.vue";
import HistoryToolbar from "@/components/HistoryToolbar.vue";
import { useHistory } from "@/composables/use-history";
import { connectGenerateTask, getGenerateQueueStatus } from "@/api";
import { useAuth } from "@/composables/use-auth";
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
const { user, logout } = useAuth();
const router = useRouter();
const filter = ref<HistoryFilter>("all");
const query = ref("");
const favoritesOnly = ref(false);
const composerInitial = shallowRef<ComposerInitial | undefined>(undefined);
const composerKey = ref(0);
const generating = ref<GeneratingTask[]>([]);
const sockets = new Map<string, WebSocket>();
const PENDING_TASK_STORAGE_PREFIX = "image-2:pending-generate-tasks";
const DEFAULT_MAX_ACTIVE_TASKS = 2;
const configuredMaxActiveTasks = Number.parseInt(
  import.meta.env.VITE_IMAGE_GENERATION_MAX_ACTIVE_TASKS_PER_USER ?? "",
  10,
);
const maxActiveTasks =
  Number.isFinite(configuredMaxActiveTasks) && configuredMaxActiveTasks > 0
    ? configuredMaxActiveTasks
    : DEFAULT_MAX_ACTIVE_TASKS;
const activeTaskCount = computed(() => generating.value.length);

type PendingGenerateTask = {
  id: string;
  request: GenerateRequest;
};

function handleLogout() {
  logout();
  void router.replace("/login");
}

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
  savePendingTask({ id: taskId, request });
}

function handleReady(taskId: string, request: GenerateRequest) {
  connectTask(taskId, request);
}

function handleCreateFailure(
  taskId: string,
  request: GenerateRequest,
  message: string,
) {
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
    errorMessage: message,
  });
}

function getPendingTaskStorageKey(): string {
  return user.value?.id
    ? `${PENDING_TASK_STORAGE_PREFIX}:${user.value.id}`
    : PENDING_TASK_STORAGE_PREFIX;
}

function readPendingTasks(): PendingGenerateTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getPendingTaskStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingGenerateTask =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.request &&
        typeof item.request === "object" &&
        typeof item.request.prompt === "string",
    );
  } catch {
    return [];
  }
}

function writePendingTasks(tasks: PendingGenerateTask[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getPendingTaskStorageKey(),
      JSON.stringify(tasks),
    );
  } catch {
    // Ignore storage quota or privacy-mode failures.
  }
}

function savePendingTask(task: PendingGenerateTask) {
  const tasks = readPendingTasks().filter((item) => item.id !== task.id);
  writePendingTasks([task, ...tasks]);
}

function removePendingTask(taskId: string) {
  const tasks = readPendingTasks().filter((item) => item.id !== taskId);
  if (tasks.length === 0 && typeof window !== "undefined") {
    window.localStorage.removeItem(getPendingTaskStorageKey());
    return;
  }
  writePendingTasks(tasks);
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
  removePendingTask(taskId);
  add(item);
}

async function restorePendingTasks() {
  const pendingTasks = readPendingTasks();
  if (pendingTasks.length === 0) return;

  const restoredTasks = await Promise.all(
    pendingTasks.map(async (task): Promise<GeneratingTask | null> => {
      try {
        const status = await getGenerateQueueStatus(task.id);
        if (!status) return null;
        return {
          id: task.id,
          request: task.request,
          status: status.status,
          total: status.total,
          completed: status.completed,
          active: status.active,
          queuedAt: status.queuedAt,
          generationStartedAt: status.generationStartedAt,
        };
      } catch {
        return null;
      }
    }),
  );

  const restored = restoredTasks.filter(
    (task): task is GeneratingTask => task !== null,
  );
  const restoredIds = new Set(restored.map((task) => task.id));

  for (const task of pendingTasks) {
    if (!restoredIds.has(task.id)) {
      removePendingTask(task.id);
    }
  }

  if (restored.length === 0) return;

  generating.value = [
    ...restored,
    ...generating.value.filter((task) => !restoredIds.has(task.id)),
  ];

  for (const task of restored) {
    connectTask(task.id, task.request);
  }
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

onMounted(() => {
  void restorePendingTasks();
});
</script>
