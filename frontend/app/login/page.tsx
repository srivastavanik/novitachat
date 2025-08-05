'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      router.push('/chat')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white px-4 relative overflow-hidden">
      {/* Liquid Glass Background Layers */}
      <div className="grain-overlay"></div>
      <div className="gradient-grid"></div>
      <div className="radial-glow"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <span className="text-2xl font-medium">Nova</span>
          </Link>
          <h2 className="text-4xl font-light">Welcome back</h2>
          <p className="mt-2 text-sm text-white/60">
            Sign in to your Nova account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="feature-card p-8">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF7F]/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF7F]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between mt-6">
              <Link href="/forgot-password" className="text-sm text-white/60 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-white/60">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-[#00FF7F] hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
