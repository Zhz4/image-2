import { computed, readonly, ref } from "vue";

import { getCurrentUser, login as loginApi, register as registerApi } from "@/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth-token";
import { setHistoryStoreUserId } from "@/lib/history-store";
import type { AuthUser } from "@/lib/types";

const user = ref<AuthUser | null>(null);
const ready = ref(false);
let initPromise: Promise<void> | null = null;

function setUser(nextUser: AuthUser | null) {
  user.value = nextUser;
  setHistoryStoreUserId(nextUser?.id ?? null);
}

async function initAuth(): Promise<void> {
  if (ready.value) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      ready.value = true;
      return;
    }

    try {
      const response = await getCurrentUser();
      setUser(response.user);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      ready.value = true;
    }
  })();

  return initPromise;
}

async function login(email: string, password: string): Promise<AuthUser> {
  const response = await loginApi({ email, password });
  setAuthToken(response.token);
  setUser(response.user);
  ready.value = true;
  return response.user;
}

async function register(email: string, password: string): Promise<AuthUser> {
  const response = await registerApi({ email, password });
  setAuthToken(response.token);
  setUser(response.user);
  ready.value = true;
  return response.user;
}

function logout() {
  clearAuthToken();
  setUser(null);
  ready.value = true;
}

export function useAuth() {
  return {
    user: readonly(user),
    ready: readonly(ready),
    isAuthenticated: computed(() => Boolean(user.value)),
    initAuth,
    login,
    register,
    logout,
  };
}
