'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(email, password, username)
      router.push('/chat')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register')
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
            <span className="text-2xl font-medium">Chat</span>
          </Link>
                        <h2 className="text-3xl font-semibold tracking-tight">Create an account</h2>
          <p className="mt-2 text-sm text-white/60">
                          Get started with Chat today
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
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF7F]/50 transition-all"
                  placeholder="johndoe"
                />
              </div>

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
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF7F]/50 transition-all"
                  placeholder="••••••••"
                />
                <p className="mt-2 text-xs text-white/40">
                  Must be at least 6 characters
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center space-x-3 text-sm text-white/60">
                <CheckCircle className="h-4 w-4 text-[#00FF7F]" />
                <span>Free 10 messages to try</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-white/60">
                <CheckCircle className="h-4 w-4 text-[#00FF7F]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-white/60">
                <CheckCircle className="h-4 w-4 text-[#00FF7F]" />
                <span>Cancel anytime</span>
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
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#00FF7F] hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-white/40 px-8">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
