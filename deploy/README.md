# Docker 部署

## 直接拉取 Docker Hub 镜像部署

服务器只需要根目录的 `docker-compose.yml` 和 `.env.prod`：

```bash
cp .env.prod.example .env.prod
# 编辑 .env.prod，填入 OpenAI 和 Cloudflare R2 配置

docker compose --env-file .env.prod pull
docker compose --env-file .env.prod up -d
```

默认访问地址：

```text
http://服务器IP:8080
```

如果要使用 80 端口，把 `.env.prod` 里的 `APP_PORT` 改成：

```env
APP_PORT=80
```

## 更新镜像

GitHub Actions 推送新镜像后，服务器执行：

```bash
docker compose --env-file .env.prod pull
docker compose --env-file .env.prod up -d
```

## 本地从源码构建

`deploy/docker-compose.build.yml` 用于本地从源码构建镜像：

```bash
cp deploy/.env.docker.example .env.docker
docker compose -f deploy/docker-compose.build.yml up -d --build
```
