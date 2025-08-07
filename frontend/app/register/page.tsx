'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false)

  useEffect(() => {
    if (user) {
      router.push('/chat')
    }
  }, [user, router])

  const handleOAuthLogin = async () => {
    setIsLoadingOAuth(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/external-auth/url`);

      if (!response.ok) {
        throw new Error("Failed to get auth URL");
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("OAuth login error:", error);
      setError('Failed to connect to Novita authentication service. Please try again.');
      setIsLoadingOAuth(false);
    }
  };

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

            <p className="text-center text-sm text-white/60 mb-6">
              Create your Chat account
            </p>

            <div className="text-center text-xs text-white/40 mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
              <p><strong>Quick signup:</strong> Use "Continue with Novita" for instant access</p>
              <p><strong>Manual signup:</strong> Fill out the form below</p>
            </div>

            {/* Novita OAuth Signup */}
            <button
              type="button"
              onClick={handleOAuthLogin}
              disabled={isLoadingOAuth || loading}
              className="w-full py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center mb-6"
            >
              {isLoadingOAuth ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg width="24" height="15" viewBox="0 0 24 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M24 14.8323V14.8326H14.3246L9.16716 9.67507V14.8326H0V14.8314L9.16716 5.66422V0H9.16774L24 14.8323Z" fill="black"/>
                  </svg>
                  <span>Continue with Novita</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-white/40">
                  or
                </span>
              </div>
            </div>

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
