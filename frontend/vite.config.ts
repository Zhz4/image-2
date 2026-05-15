import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { normalizeDevProxyConfig } from './src/lib/devProxy'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

function loadDevProxyConfig() {
  try {
    return normalizeDevProxyConfig(
      JSON.parse(readFileSync('./dev-proxy.config.json', 'utf-8')) as unknown,
    )
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return null
    throw error
  }
}

function loadBackendTarget() {
  if (process.env.VITE_BACKEND_URL) return process.env.VITE_BACKEND_URL

  try {
    const envText = readFileSync('../backend/.env', 'utf-8')
    const port = envText
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*PORT\s*=\s*(.+?)\s*$/)?.[1])
      .find(Boolean)
      ?.replace(/^["']|["']$/g, '')
    if (port) return `http://127.0.0.1:${port}`
  } catch {
    /* backend/.env is optional in fresh checkouts. */
  }

  return 'http://127.0.0.1:3002'
}

const backendTarget = loadBackendTarget()

export default defineConfig(({ command }) => {
  const devProxyConfig = command === 'serve' ? loadDevProxyConfig() : null

  return {
    plugins: [react()],
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __DEV_PROXY_CONFIG__: JSON.stringify(devProxyConfig),
      __BACKEND_API_BASE__: JSON.stringify(backendTarget),
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
        ...(devProxyConfig?.enabled
          ? {
              [devProxyConfig.prefix]: {
                target: devProxyConfig.target,
                changeOrigin: devProxyConfig.changeOrigin,
                secure: devProxyConfig.secure,
                rewrite: (path) =>
                  path.replace(
                    new RegExp(`^${devProxyConfig.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
                    '',
                  ),
              },
            }
          : {}),
      },
    },
  }
})
