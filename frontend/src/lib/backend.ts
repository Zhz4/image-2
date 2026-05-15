export function getBackendApiBase() {
  return (__BACKEND_API_BASE__ || '').replace(/\/+$/, '')
}

export function getBackendHttpUrl(path: string) {
  const base = getBackendApiBase()
  if (!base) return path
  return new URL(path, `${base}/`).toString()
}
