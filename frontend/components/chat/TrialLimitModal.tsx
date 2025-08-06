'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { X, ArrowRight, Mail, Loader2 } from 'lucide-react'
import axios from '@/lib/axios-config'

interface TrialLimitModalProps {
  isOpen: boolean
  onClose: () => void
  messageCount: number
}

export default function TrialLimitModal({ isOpen, onClose, messageCount }: TrialLimitModalProps) {
  const router = useRouter()
  const [isLoadingOAuth, setIsLoadingOAuth] = useState(false)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [error, setError] = useState('')
  const { login, register } = useAuth()

  if (!isOpen) return null

  const handleOAuthLogin = async () => {
    setIsLoadingOAuth(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/external-auth/url`)

      if (!response.ok) {
        throw new Error('Failed to get auth URL')
      }

      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (error) {
      console.error('OAuth login error:', error)
      setError('Failed to connect to authentication service. Please try again.')
      setIsLoadingOAuth(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingEmail(true)
    setError('')

    try {
      if (isSignUp) {
        await register(email, password, username)
      } else {
        await login(email, password)
      }
      
      // Redirect to chat after successful authentication
      router.push('/chat')
    } catch (error: any) {
      console.error('Email auth error:', error)
      setError(error.response?.data?.error || (isSignUp ? 'Failed to create account' : 'Invalid email or password'))
    } finally {
      setIsLoadingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/20 rounded-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Trial Complete!</h2>
          <p className="text-gray-600 dark:text-white/60 text-sm">
            You've used all {messageCount} free messages. Sign up to continue with unlimited access!
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {!showEmailForm ? (
          <>
            <div className="space-y-4 mb-6">
              {/* Novita OAuth */}
              <button
                onClick={handleOAuthLogin}
                disabled={isLoadingOAuth || isLoadingEmail}
                className="w-full py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
              >
                {isLoadingOAuth ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                  <span className="bg-black px-2 text-white/40">or</span>
                </div>
              </div>

              {/* Email Form Toggle */}
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 border border-white/20 text-white font-medium rounded-full hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                <span>Continue with Email</span>
              </button>
            </div>

            <p className="text-center text-xs text-white/40">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1"
              >
                <ArrowRight className="h-3 w-3 rotate-180" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-[#00FF7F] hover:underline"
              >
                {isSignUp ? 'Already have an account?' : 'Need an account?'}
              </button>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF7F]/50 focus:ring-1 focus:ring-[#00FF7F]/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoadingEmail || isLoadingOAuth}
              className="w-full py-3 bg-gradient-to-r from-[#00FF7F] to-[#00D96A] text-black font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {isLoadingEmail ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}