import { createRouter, createWebHistory } from "vue-router";

import { useAuth } from "@/composables/use-auth";
import HomeView from "@/views/HomeView.vue";
import LoginView from "@/views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
  ],
});

function getSafeRedirect(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

router.beforeEach(async (to) => {
  const auth = useAuth();
  await auth.initAuth();

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  if (to.name === "login" && auth.isAuthenticated.value) {
    const redirect = getSafeRedirect(to.query.redirect);
    return redirect === "/login" ? "/" : redirect;
  }

  return true;
});

export default router;
