<template>
  <div
    v-if="!hidden"
    class="relative flex flex-row items-start gap-3 rounded-xl border bg-card px-5 py-4 text-card-foreground shadow-sm"
  >
    <div
      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <el-icon :size="16">
        <Bell />
      </el-icon>
    </div>
    <div class="flex-1 space-y-1 text-sm leading-relaxed">
      <p class="font-medium">系统维护通知</p>
      <p class="text-muted-foreground">已知问题都已经进行了修改。</p>
      <p class="text-muted-foreground">
        默认会上传到图集，有隐私需要开启隐私模式。
      </p>
      <p class="text-muted-foreground">
        大家生成图片的时候最好不要上传真人照片做暧昧动作，目前增加了用户 id ip
        追溯系统，如果有太过分的我真封号封 IP 了。
      </p>
    </div>
    <el-button
      class="!absolute !right-2 !top-2"
      circle
      text
      title="关闭通知"
      @click="dismiss"
    >
      <el-icon>
        <Close />
      </el-icon>
      <span class="sr-only">关闭通知</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { Bell, Close } from "@element-plus/icons-vue";
import { ref } from "vue";

const STORAGE_KEY = "image-2:announcement-dismissed";
const hidden = ref(
  typeof window === "undefined" ||
    window.localStorage.getItem(STORAGE_KEY) === "1",
);

function dismiss() {
  window.localStorage.setItem(STORAGE_KEY, "1");
  hidden.value = true;
}
</script>
