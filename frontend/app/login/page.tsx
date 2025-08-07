'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
import axios from '@/lib/axios-config'

export default function LoginPage() {
  const router = useRouter()
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { user, login } = useAuth()

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingEmail(true);
    setError('');

    try {
      await login(email, password);
      router.push('/chat');
    } catch (error: any) {
      console.error('Email login error:', error);
      setError(error.response?.data?.error || 'Invalid email or password');
    } finally {
      setIsLoadingEmail(false);
    }
  };

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
                        <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-white/60">
                            Sign in to your Chat account
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="feature-card p-8">
            <div className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <p className="text-center text-sm text-white/60 mb-6">
                Sign in to your Chat account
              </p>

              <div className="text-center text-xs text-white/40 mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                <p><strong>New users:</strong> Use "Continue with Novita" for quick access</p>
                <p><strong>Existing users:</strong> Use the email method you signed up with</p>
              </div>

              {/* Novita OAuth Login */}
              <button
                onClick={handleOAuthLogin}
                disabled={isLoadingOAuth || isLoadingEmail}
                className="w-full py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-white/40">
                    or
                  </span>
                </div>
              </div>

              {/* Email/Password Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50"
                      placeholder="you@example.com or username"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingEmail || isLoadingOAuth}
                  className="w-full py-3 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingEmail ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Sign in with Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-sm text-white/60">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-[#00FF7F] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
