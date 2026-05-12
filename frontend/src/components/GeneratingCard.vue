<template>
  <div
    ref="rootRef"
    class="relative flex h-40 w-full max-w-[404px] gap-0 overflow-hidden rounded-lg border border-primary/30 bg-card py-0 text-card-foreground shadow-xs sm:w-[404px]"
  >
    <div
      class="relative h-full w-40 shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      <div
        ref="sweepRef"
        class="absolute inset-0"
        :style="{
          backgroundImage:
            'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)',
          backgroundSize: '200% 100%',
          backgroundPositionX: '-100%',
        }"
      />
      <div
        ref="orb1Ref"
        class="absolute -left-4 top-6 h-16 w-16 rounded-full bg-fuchsia-500/40 blur-2xl"
      />
      <div
        ref="orb2Ref"
        class="absolute right-2 top-2 h-14 w-14 rounded-full bg-cyan-400/40 blur-2xl"
      />
      <div
        ref="orb3Ref"
        class="absolute bottom-0 left-10 h-16 w-16 rounded-full bg-indigo-500/40 blur-2xl"
      />

      <div
        class="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white shadow-sm"
      >
        <span
          :class="[
            'h-1.5 w-1.5 rounded-full',
            isGenerating ? 'animate-pulse bg-primary' : 'bg-white/60',
          ]"
        />
        {{ isGenerating ? formatElapsed(elapsed) : "等待中" }}
      </div>

      <div class="absolute inset-0 flex items-center justify-center">
        <div ref="ringRef" class="relative h-14 w-14">
          <span class="absolute inset-0 rounded-full border-2 border-white/10" />
          <span
            class="absolute inset-0 rounded-full border-2 border-transparent"
            :style="{
              borderTopColor: 'rgba(255,255,255,0.85)',
              borderRightColor: 'rgba(255,255,255,0.35)',
            }"
          />
          <span
            class="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          />
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col px-3 py-3">
      <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
        <span class="relative flex h-2 w-2">
          <span
            v-if="isGenerating"
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70"
          />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {{ isGenerating ? "Generating" : "Waiting" }}
        <span v-if="isGenerating" ref="dotsRef" class="inline-flex gap-0.5">
          <i class="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
          <i class="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
          <i class="inline-block h-1 w-1 rounded-full bg-primary opacity-40" />
        </span>
      </div>

      <p class="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-foreground/90">
        {{ request.prompt }}
      </p>

      <div ref="barsRef" class="mt-auto flex flex-col gap-1.5 pb-1">
        <i class="block h-1.5 w-3/4 rounded-full bg-gradient-to-r from-primary/60 to-primary/10" />
        <i class="block h-1.5 w-1/2 rounded-full bg-gradient-to-r from-primary/50 to-primary/10" />
        <i class="block h-1.5 w-2/3 rounded-full bg-gradient-to-r from-primary/40 to-primary/10" />
      </div>

      <div class="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{{ request.size }}</span>
        <span>{{ request.quality }}</span>
        <span>{{ request.format }}</span>
        <span>×{{ request.n }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from "gsap";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { GeneratingTask } from "@/lib/types";

const props = defineProps<{
  task: GeneratingTask;
}>();

const rootRef = ref<HTMLDivElement | null>(null);
const sweepRef = ref<HTMLDivElement | null>(null);
const orb1Ref = ref<HTMLDivElement | null>(null);
const orb2Ref = ref<HTMLDivElement | null>(null);
const orb3Ref = ref<HTMLDivElement | null>(null);
const ringRef = ref<HTMLDivElement | null>(null);
const dotsRef = ref<HTMLSpanElement | null>(null);
const barsRef = ref<HTMLDivElement | null>(null);
const elapsed = ref(0);
const isGenerating = computed(
  () => props.task.status === "generating" || Boolean(generationStartedAt.value),
);
const generationStartedAt = computed(() => props.task.generationStartedAt);
const request = computed(() => props.task.request);

let intervalId: number | undefined;
let ctx: gsap.Context | undefined;
let ringTween: gsap.core.Tween | undefined;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

onMounted(() => {
  intervalId = window.setInterval(() => {
    elapsed.value = generationStartedAt.value
      ? Date.now() - generationStartedAt.value
      : 0;
  }, 1000);

  ctx = gsap.context(() => {
    gsap.from(rootRef.value, {
      opacity: 0,
      y: 12,
      scale: 0.96,
      duration: 0.45,
      ease: "power2.out",
    });

    gsap.to(sweepRef.value, {
      backgroundPositionX: "200%",
      duration: 1.6,
      ease: "none",
      repeat: -1,
    });

    ringTween = gsap.to(ringRef.value, {
      rotate: 360,
      duration: 2.4,
      ease: "none",
      repeat: -1,
      transformOrigin: "50% 50%",
    });

    gsap.to([orb1Ref.value, orb2Ref.value, orb3Ref.value], {
      scale: 1.4,
      opacity: 0.9,
      duration: 1.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: 0.18,
    });

    gsap.to([orb1Ref.value, orb2Ref.value, orb3Ref.value], {
      x: "+=10",
      y: "-=6",
      duration: 1.4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: 0.22,
    });

    if (dotsRef.value) {
      const dots = dotsRef.value.querySelectorAll<HTMLSpanElement>("i");
      gsap.to(dots, {
        y: -4,
        opacity: 1,
        duration: 0.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.15,
      });
    }

    if (barsRef.value) {
      const bars = barsRef.value.querySelectorAll<HTMLDivElement>("i");
      gsap.fromTo(
        bars,
        { scaleX: 0.2 },
        {
          scaleX: 1,
          duration: 1,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.18,
          transformOrigin: "0% 50%",
        },
      );
    }
  }, rootRef.value ?? undefined);
});

watch(isGenerating, (generating) => {
  if (generating) {
    ringTween?.play();
  } else {
    ringTween?.pause(0);
  }
});

onBeforeUnmount(() => {
  if (intervalId) window.clearInterval(intervalId);
  ctx?.revert();
});
</script>
