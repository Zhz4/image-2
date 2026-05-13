# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY backend backend
COPY frontend frontend
RUN pnpm build
RUN pnpm deploy --filter @image-2/backend --prod --legacy /prod/backend

FROM node:20-alpine AS backend
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend ./
EXPOSE 3002
CMD ["node", "dist/server.js"]

FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
