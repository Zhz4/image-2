<template>
  <div ref="rootRef" class="pb-2 pt-2">
    <div
      :class="[
        'group/composer relative rounded-2xl transition-all duration-500',
        focused
          ? 'shadow-[0_8px_40px_-8px_rgba(99,102,241,0.35)]'
          : 'shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)]',
      ]"
    >
      <div
        ref="auraRef"
        aria-hidden="true"
        :class="[
          'pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500',
          focused ? 'opacity-100' : '',
        ]"
        :style="{
          background:
            'linear-gradient(110deg, rgba(168,85,247,0.55), rgba(56,189,248,0.55), rgba(236,72,153,0.55), rgba(168,85,247,0.55))',
          backgroundSize: '200% 100%',
          padding: '1px',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }"
      />

      <div
        aria-hidden="true"
        :class="[
          'pointer-events-none absolute -inset-6 -z-10 rounded-[28px] opacity-0 blur-2xl transition-opacity duration-700',
          focused ? 'opacity-60' : '',
        ]"
        :style="{
          background:
            'radial-gradient(60% 80% at 30% 50%, rgba(168,85,247,0.25), transparent), radial-gradient(60% 80% at 75% 60%, rgba(56,189,248,0.22), transparent)',
        }"
      />

      <div
        class="relative overflow-hidden rounded-2xl border bg-background/85 backdrop-blur-xl supports-backdrop-filter:bg-background/65"
      >
        <div
          v-if="referenceImages.length > 0 || uploadingReferenceImages"
          class="flex gap-2 overflow-x-auto border-b border-border/60 px-4 py-3"
        >
          <div
            v-for="(image, index) in referenceImages"
            :key="`${image.name}-${index}`"
            class="group/reference relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted"
          >
            <img
              :src="image.url"
              :alt="image.name"
              class="h-full w-full object-cover"
            />
            <button
              type="button"
              class="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-sm bg-black/70 text-white opacity-0 transition-opacity group-hover/reference:opacity-100"
              title="移除参考图"
              @click="removeReferenceImage(index)"
            >
              <el-icon class="size-3"><Close /></el-icon>
              <span class="sr-only">移除参考图</span>
            </button>
          </div>
          <div
            v-if="uploadingReferenceImages"
            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-primary/40 bg-primary/5 text-primary"
            title="上传中"
          >
            <el-icon class="is-loading size-4"><Loading /></el-icon>
          </div>
        </div>

        <div class="relative px-4 pb-2 pt-4">
          <div class="flex items-start gap-2">
            <el-icon
              ref="sparkleRef"
              :class="[
                'mt-1.5 size-4 shrink-0 transition-colors duration-300',
                focused ? 'text-primary' : 'text-muted-foreground/60',
              ]"
            >
              <MagicStick />
            </el-icon>
            <el-input
              v-model="form.prompt"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 6 }"
              class="composer-textarea flex-1"
              placeholder="描述你想生成的图片，越具体越精彩…"
              @focus="focused = true"
              @blur="focused = false"
              @keydown="handleKeydown"
              @paste="handlePaste"
            />
          </div>
          <p v-if="error" class="mt-1 pl-6 text-xs text-destructive">{{ error }}</p>
          <div
            class="pointer-events-none absolute right-4 top-3 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50 opacity-0 transition-opacity duration-300 group-focus-within/composer:opacity-100"
          >
            <kbd class="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd class="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
          </div>
        </div>

        <div
          class="flex flex-wrap items-end gap-2 border-t border-border/60 bg-linear-to-b from-transparent to-muted/15 px-3 py-2.5"
        >
          <div class="group/param flex flex-col gap-0.5">
            <span class="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-200 group-hover/param:text-foreground/80 group-focus-within/param:text-primary">
              尺寸
            </span>
            <el-select v-model="form.size" class="min-w-27.5" size="small">
              <el-option v-for="opt in SIZE_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>

          <div class="group/param flex flex-col gap-0.5">
            <span class="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-200 group-hover/param:text-foreground/80 group-focus-within/param:text-primary">
              质量
            </span>
            <el-select v-model="form.quality" class="min-w-27.5" size="small">
              <el-option v-for="opt in QUALITY_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>

          <div class="group/param flex flex-col gap-0.5">
            <span class="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-200 group-hover/param:text-foreground/80 group-focus-within/param:text-primary">
              格式
            </span>
            <el-select v-model="form.format" class="min-w-27.5" size="small">
              <el-option v-for="opt in FORMAT_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>

          <div class="group/param flex flex-col gap-0.5">
            <span class="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-200 group-hover/param:text-foreground/80 group-focus-within/param:text-primary">
              数量
            </span>
            <el-select v-model="form.n" class="min-w-27.5" size="small">
              <el-option v-for="opt in N_OPTIONS" :key="opt" :label="`${opt}`" :value="opt" />
            </el-select>
          </div>

          <div class="ml-auto flex items-center gap-1.5">
            <el-button
              circle
              text
              :loading="uploadingReferenceImages"
              :disabled="uploadingReferenceImages"
              title="添加参考图"
              class="group/attach !text-muted-foreground/70 transition-all"
              @click="fileInputRef?.click()"
            >
              <el-icon>
                <Paperclip class="transition-transform duration-300 group-hover/attach:-rotate-12 group-hover/attach:scale-110" />
              </el-icon>
              <span class="sr-only">添加参考图</span>
            </el-button>
            <input
              ref="fileInputRef"
              class="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              @change="handleReferenceFiles"
            />

            <button
              ref="sendRef"
              type="button"
              :disabled="!canSubmit"
              :class="[
                'group/send relative inline-flex size-9 items-center justify-center overflow-hidden rounded-md text-sm font-medium transition-all duration-300',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                canSubmit
                  ? 'bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-white shadow-[0_4px_20px_-4px_rgba(168,85,247,0.6)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_-2px_rgba(168,85,247,0.75)] active:translate-y-0 active:scale-95'
                  : 'cursor-not-allowed bg-muted text-muted-foreground/50',
              ]"
              :title="canSubmit ? '生成（Ctrl + Enter）' : '请输入提示词'"
              @click="handleSubmit"
            >
              <span
                ref="sendShineRef"
                aria-hidden="true"
                class="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/60 to-transparent"
                style="opacity: 0"
              />
              <span
                v-if="canSubmit"
                aria-hidden="true"
                class="absolute inset-0 rounded-md opacity-0 transition-opacity duration-500 group-hover/send:opacity-100"
                :style="{
                  background:
                    'radial-gradient(circle at 50% 120%, rgba(255,255,255,0.5), transparent 60%)',
                }"
              />
              <el-icon
                :class="[
                  'relative size-4 transition-transform duration-300',
                  canSubmit ? 'group-hover/send:-translate-y-0.5' : '',
                ]"
              >
                <Top />
              </el-icon>
              <span
                v-if="canSubmit"
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-white/15"
              />
              <span class="sr-only">生成</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Close, Loading, MagicStick, Paperclip, Top } from "@element-plus/icons-vue";
import gsap from "gsap";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import { createGenerateTask, uploadReferenceImage } from "@/api";
import {
  FORMAT_OPTIONS,
  N_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type GenerateRequest,
  type ReferenceImage,
} from "@/lib/types";

type Initial = Partial<Omit<GenerateRequest, "prompt">> & { prompt?: string };

const props = defineProps<{
  initial?: Initial;
  resetKey?: number;
}>();

const emit = defineEmits<{
  start: [taskId: string, request: GenerateRequest];
}>();

const DEFAULT_VALUES: GenerateRequest = {
  prompt: "",
  size: "auto",
  quality: "auto",
  format: "png",
  n: 1,
};
const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

const form = reactive<GenerateRequest>(makeInitial(props.initial));
const error = ref<string | null>(null);
const focused = ref(false);
const referenceImages = ref<ReferenceImage[]>(
  props.initial?.referenceImages ? [...props.initial.referenceImages] : [],
);
const uploadingReferenceImages = ref(false);

const rootRef = ref<HTMLDivElement | null>(null);
const auraRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const sendRef = ref<HTMLButtonElement | null>(null);
const sendShineRef = ref<HTMLSpanElement | null>(null);
const sparkleRef = ref<unknown>(null);
const canSubmit = computed(
  () => form.prompt.trim().length > 0 && !uploadingReferenceImages.value,
);

let ctx: gsap.Context | undefined;
let resetTimer: number | undefined;

function makeInitial(initial?: Initial): GenerateRequest {
  return {
    prompt: initial?.prompt ?? DEFAULT_VALUES.prompt,
    size: initial?.size ?? DEFAULT_VALUES.size,
    quality: initial?.quality ?? DEFAULT_VALUES.quality,
    format: initial?.format ?? DEFAULT_VALUES.format,
    n: initial?.n ?? DEFAULT_VALUES.n,
    referenceImages: initial?.referenceImages
      ? [...initial.referenceImages]
      : undefined,
  };
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resetForm() {
  const next = makeInitial(props.initial);
  Object.assign(form, next);
  referenceImages.value = next.referenceImages ? [...next.referenceImages] : [];
  error.value = null;
}

async function handleReferenceFiles(e: Event) {
  const input = e.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  await uploadReferenceFiles(files);
}

async function handlePaste(e: ClipboardEvent) {
  const clipboard = e.clipboardData;
  if (!clipboard) return;

  const files = Array.from(clipboard.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (files.length === 0) return;
  e.preventDefault();
  await uploadReferenceFiles(files);
}

async function uploadReferenceFiles(files: File[]) {
  if (files.length === 0) return;
  if (uploadingReferenceImages.value) {
    error.value = "图片正在上传中";
    return;
  }

  const remainingSlots = Math.max(
    MAX_REFERENCE_IMAGES - referenceImages.value.length,
    0,
  );
  if (remainingSlots === 0) {
    error.value = `最多添加 ${MAX_REFERENCE_IMAGES} 张参考图`;
    return;
  }

  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  const uploadFiles = files.slice(0, remainingSlots);
  const next: ReferenceImage[] = [];
  error.value = null;
  uploadingReferenceImages.value = true;

  try {
    for (const file of uploadFiles) {
      if (!allowedTypes.has(file.type)) {
        error.value = "参考图仅支持 PNG、JPG、WEBP";
        continue;
      }
      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        error.value = "单张参考图不能超过 10MB";
        continue;
      }
      try {
        next.push(await uploadReferenceImage(file));
      } catch (err) {
        error.value =
          err instanceof Error ? (err as Error).message : "Failed to upload reference image";
      }
    }
  } finally {
    uploadingReferenceImages.value = false;
  }

  if (files.length > remainingSlots) {
    error.value = `最多添加 ${MAX_REFERENCE_IMAGES} 张参考图`;
  }
  referenceImages.value = [...referenceImages.value, ...next];
}

function removeReferenceImage(index: number) {
  referenceImages.value = referenceImages.value.filter((_, i) => i !== index);
}

function playSendShine() {
  if (!sendShineRef.value) return;
  gsap.fromTo(
    sendShineRef.value,
    { x: "-120%", opacity: 0.9 },
    { x: "120%", opacity: 0, duration: 0.7, ease: "power2.out" },
  );
}

function pulseSparkle() {
  const el = resolveElement(sparkleRef.value);
  if (!el) return;
  gsap.fromTo(
    el,
    { scale: 0.6, opacity: 0, rotate: -30 },
    {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.4,
      ease: "back.out(2.4)",
    },
  );
}

function resolveElement(value: unknown): Element | null {
  if (value instanceof Element) return value;
  if (value && typeof value === "object" && "$el" in value) {
    const el = (value as { $el?: unknown }).$el;
    return el instanceof Element ? el : null;
  }
  return null;
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    void handleSubmit();
  }
}

async function handleSubmit() {
  if (!canSubmit.value) return;
  error.value = null;
  const taskId = makeId();
  const request: GenerateRequest = {
    ...form,
    taskId,
    prompt: form.prompt.trim(),
    referenceImages:
      referenceImages.value.length > 0 ? [...referenceImages.value] : undefined,
  };

  if (sendRef.value) {
    gsap.fromTo(
      sendRef.value,
      { scale: 0.9 },
      { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" },
    );
  }
  playSendShine();
  pulseSparkle();

  try {
    const task = await createGenerateTask(request);
    emit("start", task.taskId, request);
    form.prompt = "";
    referenceImages.value = [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "创建任务失败";
  }
}

watch(
  () => [props.initial, props.resetKey] as const,
  () => {
    if (resetTimer) window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(resetForm, 0);
  },
);

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.fromTo(
      rootRef.value,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
    );

    if (auraRef.value) {
      gsap.to(auraRef.value, {
        backgroundPosition: "200% 50%",
        duration: 8,
        ease: "none",
        repeat: -1,
      });
    }
  }, rootRef.value ?? undefined);
});

onBeforeUnmount(() => {
  if (resetTimer) window.clearTimeout(resetTimer);
  ctx?.revert();
});
</script>

<style scoped>
.composer-textarea :deep(.el-textarea__inner) {
  min-height: 4rem !important;
  resize: none;
  border: 0;
  box-shadow: none;
  background: transparent;
  padding: 0;
  color: var(--foreground);
  line-height: 1.5rem;
}

.composer-textarea :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}
</style>
