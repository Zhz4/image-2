import { useState, type FormEvent } from 'react'

const APP_PASSWORD = 'smooth123'

export const PASSWORD_AUTH_STORAGE_KEY = 'smooth-image:password-authenticated'

type PasswordGateProps = {
  onUnlock: () => void
}

export default function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password === APP_PASSWORD) {
      window.localStorage.setItem(PASSWORD_AUTH_STORAGE_KEY, 'true')
      onUnlock()
      return
    }

    setError('密码错误，请重新输入')
    setPassword('')
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="safe-area-x min-h-screen max-w-md mx-auto flex items-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-gray-200 bg-white/85 p-6 shadow-lg shadow-gray-200/70 backdrop-blur dark:border-white/[0.08] dark:bg-gray-900/85 dark:shadow-black/30"
        >
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Smooth Image</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">输入密码进入生图</h1>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">访问密码</span>
            <input
              autoFocus
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError('')
              }}
              type="password"
              placeholder="请输入密码"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.04]"
            />
          </label>

          {error && (
            <p className="mt-3 text-sm font-medium text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            进入
          </button>
        </form>
      </div>
    </main>
  )
}
