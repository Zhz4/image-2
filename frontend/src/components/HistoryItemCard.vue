<template>
  <div
    class="flex h-40 w-full max-w-[404px] gap-0 overflow-hidden rounded-lg border bg-card py-0 text-card-foreground shadow-xs sm:w-[404px]"
  >
    <div class="relative h-full w-40 shrink-0 bg-muted">
      <button
        v-if="cover"
        type="button"
        class="grid h-full w-full cursor-zoom-in grid-cols-2 gap-px bg-background/40 text-left"
        title="打开预览"
        @click="previewOpen = true"
      >
        <img
          v-for="(src, index) in item.images.slice(0, 4)"
          :key="`${item.id}-cover-${index}`"
          :src="src"
          :alt="`${item.prompt} #${index + 1}`"
          loading="lazy"
          :class="[
            'h-full w-full object-cover',
            item.images.length === 1 ? 'col-span-2' : '',
            item.images.length === 3 && index === 0 ? 'row-span-2' : '',
          ]"
        />
      </button>
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
      >
        no image
      </div>

      <div class="pointer-events-none absolute left-2 top-2 flex gap-1">
        <span class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
          {{ aspectLabel(item.size) }}
        </span>
        <span class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
          {{ dimensionLabel(item.size) }}
        </span>
        <span
          v-if="item.images.length > 1"
          class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none"
        >
          ×{{ item.images.length }}
        </span>
      </div>
      <div
        v-if="item.durationMs != null"
        class="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white shadow-sm"
      >
        {{ formatDuration(item.durationMs) }}
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col px-3 py-3">
      <p class="line-clamp-2 min-h-10 text-sm leading-5">
        {{ item.prompt }}
      </p>
      <div class="mt-auto flex flex-wrap gap-1.5">
        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          {{ item.size }}
        </span>
        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          {{ item.quality }}
        </span>
        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          {{ item.format }}
        </span>
        <span class="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          ×{{ item.n }}
        </span>
      </div>
      <div class="flex items-center justify-end gap-0.5 pt-2">
        <el-button
          circle
          text
          size="small"
          :title="item.favorite ? '取消收藏' : '收藏'"
          @click="$emit('favorite', item.id)"
        >
          <el-icon>
            <Star :class="item.favorite ? 'fill-current text-yellow-500' : ''" />
          </el-icon>
          <span class="sr-only">收藏</span>
        </el-button>
        <el-button
          circle
          text
          size="small"
          title="重新生成"
          @click="$emit('regenerate', item)"
        >
          <el-icon><RefreshRight /></el-icon>
          <span class="sr-only">重新生成</span>
        </el-button>
        <el-button
          circle
          text
          size="small"
          title="编辑参数"
          @click="$emit('edit', item)"
        >
          <el-icon><EditPen /></el-icon>
          <span class="sr-only">编辑</span>
        </el-button>
        <el-button
          circle
          text
          size="small"
          title="删除"
          @click="$emit('delete', item.id)"
        >
          <el-icon><Delete /></el-icon>
          <span class="sr-only">删除</span>
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="previewOpen"
      align-center
      append-to-body
      class="history-preview-dialog"
      width="min(960px, 94vw)"
      :show-close="false"
    >
      <div class="flex max-h-[92vh] flex-col overflow-hidden md:flex-row">
        <div
          class="relative flex min-h-[320px] shrink-0 flex-col items-center justify-center gap-3 bg-muted p-4 md:w-1/2"
        >
          <img
            v-if="active"
            :src="active"
            :alt="item.prompt"
            class="max-h-[70vh] max-w-full rounded-md object-contain"
            @load="setNaturalSize"
          />
          <div v-if="item.images.length > 1" class="flex max-w-full gap-1.5 overflow-x-auto pb-1">
            <button
              v-for="(src, index) in item.images"
              :key="`${item.id}-thumb-${index}`"
              type="button"
              :class="[
                'shrink-0 overflow-hidden rounded border-2 transition',
                index === safeIndex
                  ? 'border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100',
              ]"
              :title="`第 ${index + 1} 张`"
              @click="activeIndex = index"
            >
              <img
                :src="src"
                :alt="`${item.prompt} #${index + 1}`"
                class="h-14 w-14 object-cover"
              />
            </button>
          </div>
          <div class="pointer-events-none absolute left-4 top-4 flex gap-1">
            <span class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
              {{ aspectLabel(item.size) }}
            </span>
            <span class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none">
              {{ dimensionDisplay }}
            </span>
            <span
              v-if="item.images.length > 1"
              class="rounded-sm bg-black/70 px-1.5 py-0 text-[10px] text-white shadow-none"
            >
              {{ safeIndex + 1 }}/{{ item.images.length }}
            </span>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col bg-card">
          <div class="flex items-start justify-between gap-2 px-5 pt-5">
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>输入内容</span>
              <el-button
                circle
                text
                size="small"
                :title="copied ? '已复制' : '复制'"
                @click="copyPrompt"
              >
                <el-icon>
                  <Check v-if="copied" />
                  <CopyDocument v-else />
                </el-icon>
                <span class="sr-only">复制</span>
              </el-button>
            </div>
            <el-button
              circle
              text
              size="small"
              class="text-muted-foreground"
              title="关闭"
              @click="previewOpen = false"
            >
              <el-icon><Close /></el-icon>
              <span class="sr-only">关闭</span>
            </el-button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 pb-2">
            <p class="mt-1 text-sm leading-6">{{ item.prompt }}</p>

            <div class="mt-5 text-xs font-medium text-muted-foreground">参数配置</div>
            <div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/40 px-4 py-3">
              <ParamField label="尺寸" :value="item.size" />
              <ParamField label="质量" :value="item.quality" />
              <ParamField label="格式" :value="item.format" />
              <ParamField label="数量" :value="`${item.n}`" />
            </div>

            <div class="mt-4 text-xs text-muted-foreground">
              创建于 {{ formatCreatedAt(item.createdAt) }}
              <span v-if="item.durationMs != null">
                · 耗时 {{ formatDuration(item.durationMs) }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 border-t px-5 py-3">
            <el-button
              plain
              size="small"
              :disabled="!active"
              @click="downloadActiveImage"
            >
              <el-icon><Download /></el-icon>
              下载图片
            </el-button>
            <el-button
              plain
              size="small"
              class="!text-blue-600 hover:!text-blue-700"
              @click="closeAnd(() => $emit('regenerate', item))"
            >
              <el-icon><RefreshRight /></el-icon>
              复用配置
            </el-button>
            <el-button
              plain
              size="small"
              class="!text-emerald-600 hover:!text-emerald-700"
              @click="closeAnd(() => $emit('edit', item))"
            >
              <el-icon><EditPen /></el-icon>
              编辑参数
            </el-button>
            <el-button
              plain
              size="small"
              class="!text-red-600 hover:!text-red-700"
              @click="closeAnd(() => $emit('delete', item.id))"
            >
              <el-icon><Delete /></el-icon>
              删除记录
            </el-button>
            <div class="ml-auto">
              <el-button
                circle
                text
                size="small"
                :title="item.favorite ? '取消收藏' : '收藏'"
                @click="$emit('favorite', item.id)"
              >
                <el-icon>
                  <Star :class="item.favorite ? 'fill-current text-yellow-500' : ''" />
                </el-icon>
                <span class="sr-only">收藏</span>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  Close,
  CopyDocument,
  Delete,
  Download,
  EditPen,
  RefreshRight,
  Star,
} from "@element-plus/icons-vue";
import { computed, defineComponent, h, ref, toRef } from "vue";

import type { HistoryItem } from "@/lib/types";

const props = defineProps<{
  item: HistoryItem;
}>();

defineEmits<{
  favorite: [id: string];
  regenerate: [item: HistoryItem];
  edit: [item: HistoryItem];
  delete: [id: string];
}>();

const item = toRef(props, "item");
const activeIndex = ref(0);
const previewOpen = ref(false);
const copied = ref(false);
const naturalSize = ref<{ w: number; h: number } | null>(null);

const cover = computed(() => item.value.images[0]);
const safeIndex = computed(() =>
  Math.min(activeIndex.value, Math.max(item.value.images.length - 1, 0)),
);
const active = computed(() => item.value.images[safeIndex.value] ?? cover.value);
const dimensionDisplay = computed(() =>
  item.value.size !== "auto"
    ? dimensionLabel(item.value.size)
    : naturalSize.value
      ? `${naturalSize.value.w}×${naturalSize.value.h}`
      : "auto",
);

const ParamField = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(fieldProps) {
    return () =>
      h("div", [
        h("div", { class: "text-[11px] text-muted-foreground" }, fieldProps.label),
        h("div", { class: "mt-0.5 text-sm font-medium" }, fieldProps.value),
      ]);
  },
});

function aspectLabel(size: HistoryItem["size"]): string {
  if (size === "auto") return "auto";
  const [w, h] = size.split("x").map((n) => Number.parseInt(n, 10));
  if (!w || !h) return size;
  if (w === h) return "≈1:1";
  if (w > h) return `≈${(w / h).toFixed(2)}:1`;
  return `≈1:${(h / w).toFixed(2)}`;
}

function dimensionLabel(size: HistoryItem["size"]): string {
  return size === "auto" ? "auto" : size.replace("x", "×");
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function setNaturalSize(e: Event) {
  const img = e.currentTarget as HTMLImageElement;
  naturalSize.value = { w: img.naturalWidth, h: img.naturalHeight };
}

function downloadFromHref(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

function getImageExtension(src: string): string {
  const dataMime = /^data:image\/([^;,]+)/i.exec(src)?.[1];
  if (dataMime) return dataMime === "jpeg" ? "jpg" : dataMime;

  const ext = src.split("?")[0]?.match(/\.([a-z0-9]+)$/i)?.[1];
  if (ext) return ext === "jpeg" ? "jpg" : ext;

  return item.value.format === "jpeg" ? "jpg" : item.value.format;
}

function makeDownloadFilename(src: string): string {
  const promptPart = item.value.prompt
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const stamp = new Date(item.value.createdAt)
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const suffix =
    item.value.images.length > 1 ? `-${safeIndex.value + 1}` : "";
  const base = promptPart || "image";
  return `${base}-${stamp}${suffix}.${getImageExtension(src)}`;
}

async function downloadActiveImage() {
  const src = active.value;
  if (!src) return;

  const filename = makeDownloadFilename(src);
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    downloadFromHref(src, filename);
    return;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    downloadFromHref(blobUrl, filename);
    URL.revokeObjectURL(blobUrl);
  } catch {
    downloadFromHref(src, filename);
  }
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(item.value.prompt);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // Ignore clipboard failures.
  }
}

function closeAnd(action: () => void) {
  previewOpen.value = false;
  action();
}
</script>
