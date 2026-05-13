# Image 2

OpenAI 兼容的图像生成工具。项目采用 Vue/Vite 前端和 Fastify 后端的前后端分离架构。

## 项目结构

```text
image-2/
├── backend/   # Fastify + TypeScript API
└── frontend/  # Vue 3 + Vite + Element Plus 前端
```

## 环境变量

后端读取 `backend/.env`：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_IMAGE_MODEL=
OPENAI_REQUEST_TIMEOUT_MS=600000
PORT=3002
```

本地开发时请把密钥配置在 `backend/.env`。

## 开发

安装依赖：

```bash
pnpm install
```

同时启动前后端：

```bash
pnpm dev
```

也可以分别启动：

```bash
pnpm dev:backend
pnpm dev:frontend
```

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3002`
- 健康检查：`http://localhost:3002/health`

## 构建与检查

```bash
pnpm lint
pnpm build
```

## SmoothAI auth setup

The login/register flow stores users in Cloudflare D1 through the D1 REST API.
Create a D1 database, apply `backend/migrations/0001_create_users.sql`, then set:

```bash
CLOUDFLARE_D1_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_API_TOKEN=
JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=604800
```

Example migration command:

```bash
wrangler d1 execute <database-name> --remote --file backend/migrations/0001_create_users.sql
```
