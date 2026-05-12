# 前后端分离重构计划

## 背景

当前项目是基于 Next.js 16 的全栈应用，前后端耦合在一起。本次重构目标是将其拆分为：

- **前端**：Vue 3 + Vite + TypeScript（替换 Next.js + React）
- **后端**：Fastify + TypeScript（独立 Node.js API 服务）

选择 **Fastify** 的理由：性能是 Express 的 2-3 倍（约 30,000~73,000 RPS），原生支持 TypeScript，内置 JSON Schema 验证和序列化，文件处理生态成熟，且学习曲线平缓。

---

## 目标目录结构

```
image-2/
├── frontend/           # Vue 3 前端
│   ├── src/
│   │   ├── components/ # Vue 组件（对应现有 React 组件）
│   │   ├── hooks/      # composables（对应现有 hooks）
│   │   ├── lib/        # 工具函数、类型、存储
│   │   ├── views/      # 页面视图
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/            # Fastify 后端
│   ├── src/
│   │   ├── routes/     # API 路由
│   │   │   └── generate.ts   # POST /api/generate
│   │   ├── lib/        # 工具（OpenAI 客户端等）
│   │   │   └── openai.ts
│   │   ├── types/      # TypeScript 类型
│   │   │   └── index.ts
│   │   └── server.ts   # 入口文件
│   ├── .env            # 环境变量
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
└── PLAN.md
```

---

## 技术选型

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | Vue 3 + Composition API | 替换 React 19 |
| 前端构建 | Vite 6 | 替换 Next.js |
| 前端样式 | Tailwind CSS v4 | 保留 |
| 前端UI | shadcn-vue / 手写组件 | 替换 shadcn/ui (React) |
| 前端动画 | GSAP 3 | 保留 |
| 前端存储 | IndexedDB + localStorage | 保留（纯客户端） |
| 后端框架 | Fastify v5 + TypeScript | 替换 Next.js API Routes |
| 后端验证 | @fastify/ajv-compiler (内置) + zod | JSON Schema 验证 |
| 后端跨域 | @fastify/cors | 允许前端访问 |
| AI 集成 | openai SDK | 保留现有逻辑 |

---

## 实施步骤

### 阶段一：创建后端（Fastify）

1. **初始化后端项目**
   ```
   backend/package.json  — fastify, @fastify/cors, openai, typescript, tsx
   backend/tsconfig.json
   ```

2. **迁移 OpenAI 客户端**
   - 来源：`lib/openai.ts` → `backend/src/lib/openai.ts`
   - 逻辑不变：读取 `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_IMAGE_MODEL` 等环境变量

3. **迁移类型定义**
   - 来源：`lib/types.ts` → `backend/src/types/index.ts`
   - 保留：`GenerateRequest`, `GenerateResponse`, `HistoryItem`, `Size`, `Quality`, `Format`

4. **迁移 API 路由**
   - 来源：`app/api/generate/route.ts` → `backend/src/routes/generate.ts`
   - 接口：`POST /api/generate`
   - 请求体验证：`prompt`(必需), `size`, `quality`, `format`, `n`
   - 响应格式：`{ images: [{src}], created: number }`
   - 保留：超时配置、错误处理逻辑

5. **创建 Fastify 服务入口**
   - `backend/src/server.ts`：注册 CORS、路由，监听端口（默认 3001）

6. **迁移环境变量**
   - 复制 `.env` → `backend/.env`

### 阶段二：创建前端（Vue 3）

1. **初始化前端项目**
   ```
   frontend/package.json  — vue3, vite, typescript, tailwindcss, gsap, axios/ofetch
   frontend/vite.config.ts — 代理 /api → http://localhost:3001
   ```

2. **迁移类型定义**
   - 来源：`lib/types.ts` → `frontend/src/lib/types.ts`

3. **迁移本地存储**
   - 来源：`lib/history-store.ts` → `frontend/src/lib/history-store.ts`
   - 改动：无（纯客户端 IndexedDB，与框架无关）

4. **迁移 Composable（Hook）**
   - 来源：`hooks/use-history.ts` → `frontend/src/composables/use-history.ts`
   - 改动：`useState/useCallback` → `ref/computed`，Vue 响应式 API

5. **迁移组件**（React → Vue SFC）

   | 原 React 组件 | 新 Vue 组件 | 关键改动 |
   |---|---|---|
   | `components/composer.tsx` | `Composer.vue` | props/emit 替换，GSAP 逻辑保留 |
   | `components/history-list.tsx` | `HistoryList.vue` | v-for 替换 map |
   | `components/history-item-card.tsx` | `HistoryItemCard.vue` | 事件用 emit |
   | `components/history-toolbar.tsx` | `HistoryToolbar.vue` | v-model 双向绑定 |
   | `components/generating-card.tsx` | `GeneratingCard.vue` | 状态绑定 |
   | `components/announcement-card.tsx` | `AnnouncementCard.vue` | localStorage 状态 |

6. **创建主视图**
   - `frontend/src/views/HomeView.vue`：整合所有组件，对应现有 `app/page.tsx`
   - `frontend/src/App.vue`：根组件
   - `frontend/src/main.ts`：挂载应用

7. **迁移全局样式**
   - `app/globals.css` → `frontend/src/assets/main.css`
   - 保留 Tailwind CSS 配置和 CSS 变量

8. **API 调用层**
   - 新建 `frontend/src/lib/api.ts`
   - 封装 `generateImages()` 函数，调用 `POST /api/generate`（通过 Vite 代理）

### 阶段三：收尾

1. 更新根目录 `README.md`，说明如何分别启动前后端
2. 可选：添加根目录 `package.json` 脚本，用 `concurrently` 同时启动前后端

---

## 关键文件映射

| 原文件 | 新位置 | 备注 |
|---|---|---|
| `app/api/generate/route.ts` | `backend/src/routes/generate.ts` | Next.js Route → Fastify Route |
| `lib/openai.ts` | `backend/src/lib/openai.ts` | 逻辑不变 |
| `lib/types.ts` | `backend/src/types/index.ts` + `frontend/src/lib/types.ts` | 共享类型各自一份 |
| `lib/history-store.ts` | `frontend/src/lib/history-store.ts` | 纯客户端，留前端 |
| `hooks/use-history.ts` | `frontend/src/composables/use-history.ts` | React Hook → Vue Composable |
| `app/page.tsx` | `frontend/src/views/HomeView.vue` | 主页面逻辑 |
| `app/globals.css` | `frontend/src/assets/main.css` | 全局样式 |
| `components/*.tsx` | `frontend/src/components/*.vue` | 组件迁移 |

---

## 开发端口约定

| 服务 | 端口 | 说明 |
|---|---|---|
| 前端 Vite Dev Server | 5173 | `npm run dev` in frontend/ |
| 后端 Fastify Server | 3001 | `npm run dev` in backend/ |
| Vite 代理 `/api` | → 3001 | 开发时自动转发，无需 CORS 问题 |

---

## 验证方式

1. 启动后端：`cd backend && npm run dev` → 访问 `http://localhost:3001/health` 应返回 `{ ok: true }`
2. 启动前端：`cd frontend && npm run dev` → 访问 `http://localhost:5173`
3. 输入 prompt，点击生成，验证图片正常生成并出现在历史记录中
4. 刷新页面，验证历史记录从 IndexedDB 正确加载
5. 验证收藏、搜索、过滤功能正常

---

## 备注

- 原有 Next.js 项目文件保持不动，不删除，新建 `frontend/` 和 `backend/` 两个子目录
- 后端不做数据持久化（历史记录完全在前端 IndexedDB），后端只做 API 代理转发到 OpenAI
- `.env` 中已有 API Key，直接复制到 `backend/.env` 使用
