<template>
  <main class="login-shell">
    <section class="login-frame" aria-label="SmoothAI 登录">
      <div class="brand-panel">
        <div class="brand-mark-row">
          <div class="brand-mark" aria-hidden="true">
            <span />
          </div>
          <strong>Smooth<span>AI</span></strong>
        </div>

        <div class="hero-copy">
          <h1>让 AI 创造<span>无限可能</span></h1>
          <p>输入想象，生成精美图像</p>
        </div>

        <div class="feature-list" aria-label="产品能力">
          <div class="feature-item">
            <span class="feature-icon">
              <el-icon><MagicStick /></el-icon>
            </span>
            <div>
              <h2>强大的 AI 模型</h2>
              <p>基于先进的 AI 技术，生成高质量图像</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">
              <el-icon><Lightning /></el-icon>
            </span>
            <div>
              <h2>极速生成</h2>
              <p>几秒钟内将你的创意变为现实</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">
              <el-icon><Lock /></el-icon>
            </span>
            <div>
              <h2>安全可靠</h2>
              <p>你的数据安全加密，隐私有保障</p>
            </div>
          </div>
        </div>

        <div class="portal-scene" aria-hidden="true">
          <div class="portal-ring" />
          <div class="portal-horizon" />
          <div class="portal-ridge ridge-left" />
          <div class="portal-ridge ridge-right" />
        </div>
      </div>

      <section class="auth-card" aria-label="账号登录注册">
        <div class="auth-heading">
          <h2>{{ isRegister ? "创建账户" : "欢迎回来" }}</h2>
          <p>
            {{
              isRegister
                ? "注册 SmoothAI 账户，开始创作"
                : "登录您的 SmoothAI 账户，继续创作"
            }}
          </p>
        </div>

        <div class="mode-switch" role="tablist" aria-label="账号模式">
          <button
            type="button"
            :class="{ active: !isRegister }"
            role="tab"
            :aria-selected="!isRegister"
            @click="mode = 'login'"
          >
            登录
          </button>
          <button
            type="button"
            :class="{ active: isRegister }"
            role="tab"
            :aria-selected="isRegister"
            @click="mode = 'register'"
          >
            注册
          </button>
        </div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <label>
            <span>邮箱地址</span>
            <el-input
              v-model="email"
              :prefix-icon="Message"
              autocomplete="email"
              placeholder="请输入您的邮箱地址"
              size="large"
            />
          </label>

          <label>
            <span>密码</span>
            <el-input
              v-model="password"
              :prefix-icon="Key"
              autocomplete="current-password"
              placeholder="请输入您的密码"
              show-password
              size="large"
              type="password"
            />
          </label>

          <label v-if="isRegister">
            <span>确认密码</span>
            <el-input
              v-model="confirmPassword"
              :prefix-icon="Lock"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              show-password
              size="large"
              type="password"
            />
          </label>

          <p v-if="error" class="auth-error">{{ error }}</p>

          <button class="submit-button" type="submit" :disabled="loading">
            <span>{{ loading ? "处理中..." : isRegister ? "注册" : "登录" }}</span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </form>

        <div class="divider">
          <span />
          <em>或</em>
          <span />
        </div>

        <p class="mode-hint">
          {{ isRegister ? "已有账户？" : "还没有账户？" }}
          <button type="button" @click="toggleMode">
            {{ isRegister ? "立即登录" : "立即注册" }}
          </button>
        </p>
      </section>
    </section>

    <p class="copyright">© 2026 SmoothAI. 保留所有权利。</p>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Key,
  Lightning,
  Lock,
  MagicStick,
  Message,
} from "@element-plus/icons-vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ApiRequestError } from "@/api/request";
import { useAuth } from "@/composables/use-auth";

const route = useRoute();
const router = useRouter();
const auth = useAuth();

const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

const isRegister = computed(() => mode.value === "register");

watch(mode, () => {
  error.value = "";
  confirmPassword.value = "";
});

function getRedirectPath(): string {
  const redirect = route.query.redirect;
  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : "/";
}

function toggleMode() {
  mode.value = isRegister.value ? "login" : "register";
}

function validateForm(): boolean {
  const normalizedEmail = email.value.trim();
  if (!normalizedEmail) {
    error.value = "请输入邮箱地址";
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    error.value = "请输入有效的邮箱地址";
    return false;
  }
  if (password.value.length < 8) {
    error.value = "密码至少需要 8 个字符";
    return false;
  }
  if (isRegister.value && password.value !== confirmPassword.value) {
    error.value = "两次输入的密码不一致";
    return false;
  }
  return true;
}

async function handleSubmit() {
  if (!validateForm()) return;

  loading.value = true;
  error.value = "";
  try {
    if (isRegister.value) {
      await auth.register(email.value.trim(), password.value);
    } else {
      await auth.login(email.value.trim(), password.value);
    }
    await router.push(getRedirectPath());
  } catch (submitError) {
    error.value =
      submitError instanceof ApiRequestError
        ? submitError.message
        : "登录服务暂时不可用";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100dvh;
  padding: 2.5rem 2.25rem 1.75rem;
  overflow: hidden;
  color: #f8fbff;
  background:
    radial-gradient(circle at 50% 52%, rgba(95, 68, 255, 0.28), transparent 18rem),
    radial-gradient(circle at 18% 18%, rgba(42, 108, 255, 0.2), transparent 20rem),
    linear-gradient(135deg, #050815 0%, #02040d 48%, #07101f 100%);
}

.login-frame {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(25rem, 43.5rem);
  gap: 3rem;
  min-height: calc(100dvh - 7rem);
  padding: 3.25rem 3.75rem;
  overflow: hidden;
  border: 1px solid rgba(122, 142, 255, 0.16);
  border-radius: 1.125rem;
  background:
    linear-gradient(115deg, rgba(4, 8, 21, 0.94), rgba(3, 6, 17, 0.86)),
    radial-gradient(circle at 42% 47%, rgba(118, 61, 255, 0.32), transparent 18rem);
  box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.48);
}

.login-frame::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background-image:
    radial-gradient(circle, rgba(134, 110, 255, 0.5) 0 1px, transparent 1px),
    radial-gradient(circle, rgba(255, 255, 255, 0.35) 0 1px, transparent 1px);
  background-position:
    0 0,
    3rem 5rem;
  background-size:
    9rem 9rem,
    13rem 13rem;
  opacity: 0.16;
}

.brand-panel {
  position: relative;
  z-index: 1;
  min-height: 42rem;
}

.brand-mark-row {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.5rem;
}

.brand-mark-row strong {
  font-size: 1.75rem;
  line-height: 1;
}

.brand-mark-row strong span {
  color: #7667ff;
}

.brand-mark {
  position: relative;
  width: 2.7rem;
  height: 2.7rem;
}

.brand-mark::before,
.brand-mark::after,
.brand-mark span {
  position: absolute;
  width: 1.9rem;
  height: 1.2rem;
  content: "";
  border-radius: 999px;
  background: linear-gradient(135deg, #9b39ff, #2f8bff);
}

.brand-mark::before {
  top: 0.25rem;
  left: 0.2rem;
  transform: rotate(-28deg);
}

.brand-mark::after {
  right: 0.15rem;
  bottom: 0.28rem;
  transform: rotate(152deg);
}

.brand-mark span {
  top: 0.78rem;
  left: 0.54rem;
  width: 1.45rem;
  height: 1.08rem;
  background: #050815;
}

.hero-copy {
  max-width: 39rem;
  margin-top: 7.3rem;
}

.hero-copy h1 {
  margin: 0;
  font-size: 3.1rem;
  line-height: 1.16;
  letter-spacing: 0;
}

.hero-copy h1 span {
  display: inline-block;
  margin-left: 0.4rem;
  color: #7a67ff;
}

.hero-copy p {
  margin: 1.25rem 0 0;
  color: rgba(235, 239, 255, 0.72);
  font-size: 1.25rem;
}

.feature-list {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 2rem;
  max-width: 25rem;
  margin-top: 3rem;
}

.feature-item {
  display: grid;
  grid-template-columns: 4.1rem minmax(0, 1fr);
  gap: 1.25rem;
  align-items: center;
}

.feature-icon {
  display: inline-flex;
  width: 4.1rem;
  height: 4.1rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(110, 93, 255, 0.34);
  border-radius: 0.9rem;
  color: #9d73ff;
  background: linear-gradient(145deg, rgba(123, 69, 255, 0.24), rgba(35, 49, 115, 0.3));
}

.feature-icon .el-icon {
  font-size: 1.55rem;
}

.feature-item h2 {
  margin: 0;
  font-size: 1.08rem;
  letter-spacing: 0;
}

.feature-item p {
  margin: 0.35rem 0 0;
  color: rgba(232, 236, 255, 0.62);
  font-size: 0.95rem;
}

.portal-scene {
  position: absolute;
  right: -12rem;
  bottom: -4.2rem;
  width: 35rem;
  height: 35rem;
  pointer-events: none;
}

.portal-ring {
  position: absolute;
  top: 3.5rem;
  right: 5rem;
  width: 18rem;
  height: 18rem;
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 46%, rgba(201, 149, 255, 0.9) 48%, rgba(89, 39, 255, 0.95) 56%, transparent 63%),
    conic-gradient(from 20deg, transparent, #693cff, #ce8cff, #6737ff, transparent, #a759ff, transparent);
  filter: drop-shadow(0 0 1.3rem rgba(125, 67, 255, 0.9));
  animation: portal-spin 16s linear infinite;
}

.portal-ring::before,
.portal-ring::after {
  position: absolute;
  content: "";
  border-radius: 50%;
}

.portal-ring::before {
  inset: 2.3rem;
  background: radial-gradient(circle, #050815 0 54%, rgba(120, 76, 255, 0.32) 55%, transparent 70%);
}

.portal-ring::after {
  inset: -3.5rem;
  background: radial-gradient(circle, rgba(119, 70, 255, 0.28), transparent 62%);
  filter: blur(1rem);
}

.portal-horizon {
  position: absolute;
  right: 1rem;
  bottom: 4.8rem;
  width: 32rem;
  height: 8rem;
  background:
    linear-gradient(to bottom, transparent, rgba(99, 56, 255, 0.36) 45%, transparent),
    linear-gradient(90deg, transparent, rgba(169, 112, 255, 0.92), transparent);
  clip-path: polygon(0 66%, 100% 50%, 100% 100%, 0 100%);
  opacity: 0.74;
}

.portal-ridge {
  position: absolute;
  bottom: 0;
  width: 25rem;
  height: 9.5rem;
  background: linear-gradient(180deg, rgba(55, 35, 148, 0.76), rgba(5, 8, 21, 0.98));
  opacity: 0.88;
}

.ridge-left {
  left: 0;
  clip-path: polygon(0 70%, 10% 45%, 24% 55%, 37% 28%, 52% 58%, 70% 36%, 100% 76%, 100% 100%, 0 100%);
}

.ridge-right {
  right: 0;
  clip-path: polygon(0 78%, 12% 48%, 26% 62%, 45% 32%, 66% 64%, 86% 38%, 100% 58%, 100% 100%, 0 100%);
}

.auth-card {
  position: relative;
  z-index: 1;
  align-self: center;
  min-height: 40.5rem;
  padding: 5.5rem 4.5rem 4.25rem;
  border: 1px solid rgba(139, 122, 255, 0.36);
  border-radius: 1.2rem;
  background:
    linear-gradient(145deg, rgba(15, 21, 44, 0.86), rgba(7, 11, 25, 0.78)),
    radial-gradient(circle at 50% 0, rgba(152, 82, 255, 0.15), transparent 19rem);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 1.5rem 5rem rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(20px);
}

.auth-heading {
  text-align: center;
}

.auth-heading h2 {
  margin: 0;
  font-size: 2.35rem;
  line-height: 1.18;
  letter-spacing: 0;
}

.auth-heading h2::first-letter,
.auth-heading h2 {
  color: #f9fbff;
}

.auth-heading h2 {
  background: linear-gradient(90deg, #ffffff 0%, #ffffff 46%, #7a67ff 47%, #9e7cff 100%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-heading p {
  margin: 1rem 0 0;
  color: rgba(232, 236, 255, 0.68);
  font-size: 1rem;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-top: 2rem;
  padding: 0.3rem;
  border: 1px solid rgba(116, 132, 255, 0.16);
  border-radius: 0.55rem;
  background: rgba(5, 9, 22, 0.64);
}

.mode-switch button {
  min-height: 2.25rem;
  border: 0;
  border-radius: 0.4rem;
  color: rgba(235, 239, 255, 0.64);
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.mode-switch button.active {
  color: #ffffff;
  background: rgba(122, 103, 255, 0.28);
}

.auth-form {
  display: grid;
  gap: 1.3rem;
  margin-top: 2rem;
}

.auth-form label {
  display: grid;
  gap: 0.65rem;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;
}

.auth-form label > span {
  font-size: 0.95rem;
}

.auth-form :deep(.el-input__wrapper) {
  min-height: 4.4rem;
  border: 1px solid rgba(115, 132, 255, 0.42);
  border-radius: 0.55rem;
  background: rgba(11, 18, 38, 0.72);
  box-shadow: none;
}

.auth-form :deep(.el-input__inner) {
  color: #f8fbff;
}

.auth-form :deep(.el-input__inner::placeholder) {
  color: rgba(220, 226, 255, 0.5);
}

.auth-form :deep(.el-input__prefix) {
  color: rgba(238, 242, 255, 0.82);
}

.auth-error {
  margin: -0.3rem 0 0;
  color: #ff9eaa;
  font-size: 0.88rem;
}

.submit-button {
  display: inline-flex;
  min-height: 4.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.65rem;
  border: 0;
  border-radius: 0.55rem;
  color: #ffffff;
  font-size: 1.18rem;
  cursor: pointer;
  background: linear-gradient(100deg, #9d39ff 0%, #6154ff 46%, #2f92ff 100%);
  box-shadow: 0 1rem 2.2rem rgba(78, 85, 255, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 1.25rem 2.8rem rgba(94, 94, 255, 0.36);
}

.submit-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: center;
  margin: 2.4rem auto 0;
  max-width: 23rem;
  color: rgba(232, 236, 255, 0.7);
}

.divider span {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 255, 0.22), transparent);
}

.divider em {
  font-style: normal;
}

.mode-hint {
  margin: 2rem 0 0;
  text-align: center;
  color: rgba(232, 236, 255, 0.76);
}

.mode-hint button {
  border: 0;
  color: #9b7cff;
  font-weight: 700;
  background: transparent;
  cursor: pointer;
}

.copyright {
  margin: 1.5rem 0 0;
  text-align: center;
  color: rgba(232, 236, 255, 0.55);
}

@keyframes portal-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 72rem) {
  .login-shell {
    padding: 1rem;
  }

  .login-frame {
    grid-template-columns: 1fr;
    gap: 2rem;
    min-height: auto;
    padding: 2rem;
  }

  .brand-panel {
    min-height: 33rem;
  }

  .hero-copy {
    margin-top: 4rem;
  }

  .portal-scene {
    right: -4rem;
    bottom: -6rem;
    transform: scale(0.78);
    transform-origin: bottom right;
  }

  .auth-card {
    min-height: auto;
    padding: 3rem 2rem;
  }
}

@media (max-width: 38rem) {
  .login-shell {
    padding: 0.75rem;
  }

  .login-frame {
    padding: 1.3rem;
    border-radius: 0.9rem;
  }

  .brand-panel {
    min-height: 28rem;
  }

  .brand-mark-row strong {
    font-size: 1.45rem;
  }

  .hero-copy {
    margin-top: 3rem;
  }

  .hero-copy h1 {
    font-size: 2.25rem;
  }

  .hero-copy h1 span {
    display: block;
    margin-left: 0;
  }

  .hero-copy p {
    font-size: 1rem;
  }

  .feature-list {
    gap: 1rem;
    margin-top: 2rem;
  }

  .feature-item {
    grid-template-columns: 3.2rem minmax(0, 1fr);
    gap: 0.9rem;
  }

  .feature-icon {
    width: 3.2rem;
    height: 3.2rem;
  }

  .feature-item h2 {
    font-size: 0.98rem;
  }

  .feature-item p {
    font-size: 0.82rem;
  }

  .portal-scene {
    right: -8.5rem;
    bottom: -7.3rem;
    transform: scale(0.56);
  }

  .auth-card {
    padding: 2.1rem 1rem;
    border-radius: 0.9rem;
  }

  .auth-heading h2 {
    font-size: 2rem;
  }

  .auth-form :deep(.el-input__wrapper),
  .submit-button {
    min-height: 3.6rem;
  }

  .divider {
    gap: 1rem;
  }
}
</style>
